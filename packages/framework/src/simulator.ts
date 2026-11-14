import type { Hookable, HookKeys, InferCallback } from 'hookable'
import type { Algorithm, NodeRef, NodeThis, RpcResponse } from './algorithm'
import type { Network, NetworkNode } from './network'
import type { MaybePromise } from './util'
import { createHooks } from 'hookable'
import { Random } from 'random'

interface Scheduled {
  time: number
  run: () => void
}

interface Abortable {
  abort: () => void
}

class AbortError extends Error { }

interface SimulatorNode<NodeMetaT> {
  id: number
  self: NodeThis
  netNode: NetworkNode<NodeMetaT>
}

export interface SimulatorConfig<NodeMetaT> {
  algorithm: Algorithm
  network: Network<NodeMetaT>
  params: Record<string, any> & {
    replyTimeout: number
  }
  maxSteps: number
  seed?: number | string
}

export interface SimulatorHookContext<NodeMetaT> {
  simulator: Simulator<NodeMetaT>
  finish: () => void
}

export interface SimulatorHooks<NodeMetaT> {
  'leader:assert': (ctx: SimulatorHookContext<NodeMetaT>, id: number, leader?: number) => MaybePromise<void>
  'leader:consent': (ctx: SimulatorHookContext<NodeMetaT>, leader: number) => MaybePromise<void>
}

export class Simulator<NodeMetaT> {
  public hooks: Hookable<SimulatorHooks<NodeMetaT>> = createHooks()

  private nodes: SimulatorNode<NodeMetaT>[] = []

  private time = 0
  private logs: string[] = []

  private queue: Scheduled[] = []
  private inFlight = new Map<number, Set<Abortable>>()
  private timers = new Map<number, Set<number>>()
  private timerHandles = 0
  private leaders = new Map<number, number>()

  private finished = false
  private failure?: unknown

  constructor(
    private config: SimulatorConfig<NodeMetaT>,
  ) { }

  reset() {
    const { nodes } = this.config.network
    this.nodes = nodes.map((node, id) => this.createNode(id, node))

    for (const node of this.nodes) {
      const neighbors = new Set([...nodes[node.id].neighbors]
        .map(n => nodes.indexOf(n.node)))

      node.self.network = [...neighbors]
        .sort((a, b) => a - b)
        .map(id => this.createRef(node, this.nodes[id]))
    }

    this.time = 0
    this.logs = []

    this.queue = []
    this.inFlight = new Map()
    this.timers = new Map()
    this.leaders = new Map()

    this.finished = false
    this.failure = undefined
  }

  private createNode(
    id: number,
    netNode: NetworkNode<NodeMetaT>,
  ): SimulatorNode<NodeMetaT> {
    const self = {
      id,
      network: [],
      params: this.config.params,
      abortOutstanding: () => this.abortOutstanding(id),
      assertLeader: leader => this.assertLeader(id, leader),

      setTimeout: (f, delay) => this.setTimeout(id, f, delay),
      clearTimeout: (handle) => {
        if (handle !== undefined)
          this.timers.get(id)?.delete(handle)
      },

      random: new Random(`${this.config.seed}/${id}`),

      callAll: (nodes, rpc, ...args) => {
        const all = Promise.all(nodes.map(target => target.call(rpc, ...args)))
        all.catch((error) => {
          this.noteError(id, error)
        })
        return all
      },
    } satisfies NodeThis

    return {
      id: self.id,
      self,
      netNode,
    }
  }

  private abortOutstanding(id: number): number {
    const pending = this.inFlight.get(id)
    if (!pending?.size)
      return 0

    let aborted = 0
    for (const abortable of pending) {
      abortable.abort()
      pending.delete(abortable)
      aborted++
    }

    return aborted
  }

  private assertLeader(id: number, leader?: NodeRef | NodeThis) {
    if (leader) {
      this.leaders.set(id, leader.id)
    }
    else {
      this.leaders.delete(id)
    }
    this.logs.push(`[${this.timestamp()}] ${id} assertLeader(${leader?.id})`)
    this.callHook('leader:assert', id, leader?.id)

    // stop once every node agrees on the same leader
    const agreed = this.leaders.get(0)
    if (agreed !== undefined && this.nodes.every(node => this.leaders.get(node.id) === agreed)) {
      this.finished = true
      this.logs.push(`[${this.timestamp()}] leader settled: ${agreed}`)
      this.callHook('leader:consent', agreed)
    }
  }

  private setTimeout(
    id: number,
    f: (this: NodeThis) => MaybePromise<void>,
    delay: number,
  ): number {
    const handle = ++this.timerHandles

    let pending = this.timers.get(id)
    if (!pending) {
      pending = new Set()
      this.timers.set(id, pending)
    }
    pending.add(handle)

    this.at(this.time + delay, async () => {
      if (!pending.delete(handle))
        return

      const node = this.nodes[id]
      if (!node)
        return

      const logLine = this.logs.length
      const name = f.name || 'timeout'
      this.logs.push(`[${this.timestamp()}] ${id} ${name}`)
      const note = (text: string) => {
        this.logs[logLine] += ` ${text}`
      }

      try {
        await f.call(node.self)
      }
      catch (error) {
        note(error instanceof AbortError
          ? 'aborted'
          : 'errored')
        this.noteError(id, error)
      }
    })

    return handle
  }

  private createRef(
    self: SimulatorNode<NodeMetaT>,
    other: SimulatorNode<NodeMetaT>,
  ): NodeRef {
    return {
      id: other.id,
      call: (rpc, ...args) => {
        const name = rpc.name || 'rpc'
        const strArgs = args.map(a => JSON.stringify(a)).join(', ')
        const label = `${name}(${strArgs})`

        return this.send(
          self,
          other,
          label,
          // eslint-disable-next-line no-async-promise-executor
          senderRef => new Promise(async (resolve) => {
            const reply = (response: any) =>
              this.send(
                other,
                self,
                `${name} reply(${JSON.stringify(response)})`,
                (senderRef, targetRef) => {
                  resolve({ target: senderRef, status: 'ok', response })
                  return { target: targetRef, status: 'ok', response: undefined }
                },
              )

            try {
              await rpc.call(other.self, { sender: senderRef, reply }, ...args)
            }
            catch (error) {
              this.noteError(other.id, error)
            }
          }),
        )
      },
    }
  }

  private send<T>(
    from: SimulatorNode<NodeMetaT>,
    to: SimulatorNode<NodeMetaT>,
    label: string,
    f: (senderRef: NodeRef, targetRef: NodeRef) => MaybePromise<RpcResponse<T>>,
  ): Promise<RpcResponse<T>> {
    const latency = this.latency(from, to)

    const logLine = this.logs.length
    this.logs.push(`[${this.timestamp()}] ${from.id} -> ${to.id} ${label}`)
    const note = (text: string) => {
      this.logs[logLine] += ` ${text}`
    }

    const senderRef = to.self.network.find(ref => ref.id === from.id)!
    const targetRef = from.self.network.find(ref => ref.id === to.id)!

    // we treat invalid latencies as disconnected
    if (!Number.isFinite(latency)) {
      note('timeout')
      return Promise.resolve({ target: targetRef, status: 'timeout' })
    }

    // schedule a timeout response
    const timeout = this.schedule(
      this.time + this.config.params.replyTimeout,
      () => ({ target: targetRef, status: 'timeout' } satisfies RpcResponse<T>),
    )

    // schedule the actual response
    const response = this.scheduleAbortable(
      from.id,
      this.time + Math.max(0, latency),
      () => f(senderRef, targetRef),
    )

    const ret = Promise.race([timeout, response])
    ret
      .then((res) => {
        note(res.status)
      })
      .catch((error) => {
        note(error instanceof AbortError
          ? 'aborted'
          : 'errored')
        this.noteError(from.id, error)
      })

    return ret
  }

  private latency(
    from: SimulatorNode<NodeMetaT>,
    to: SimulatorNode<NodeMetaT>,
  ): number {
    const link = Array.from(from.netNode.neighbors)
      .find(neighbor => neighbor.node === to.netNode)
    if (!link)
      throw new Error(`node ${from.id} tried to call non-neighboring node ${to.id}`)

    return link.latency(from.netNode, to.netNode)
  }

  private scheduleAbortable<T>(
    id: number,
    at: number,
    f: (aborted: boolean) => T,
  ): Promise<Awaited<T>> {
    const { promise, resolve, reject } = Promise.withResolvers<Awaited<T>>()

    let settled = false

    const abortable = {
      abort: () => {
        if (settled)
          return
        settled = true
        this.inFlight.get(id)?.delete(abortable)

        reject(new AbortError())
      },
    } satisfies Abortable

    let pending = this.inFlight.get(id)
    if (!pending) {
      pending = new Set()
      this.inFlight.set(id, pending)
    }

    pending.add(abortable)

    this.at(at, async () => {
      // we still run the content even when it's aborted, just not returning it
      const r = Promise.try(f, settled)
      r.catch((error) => {
        this.noteError(id, error)
      })

      if (settled)
        return
      settled = true
      this.inFlight.get(id)?.delete(abortable)

      resolve(await r)
    })

    return promise
  }

  private schedule<T>(at: number, f: () => T): Promise<T> {
    const { promise, resolve } = Promise.withResolvers<T>()

    this.at(at, () => {
      resolve(f())
    })

    return promise
  }

  private at(time: number, run: () => void) {
    if (time === Infinity)
      return

    const event = { time, run }

    const index = this.queue.findIndex(scheduled => scheduled.time > time)
    if (index === -1)
      this.queue.push(event)
    else
      this.queue.splice(index, 0, event)
  }

  async run() {
    this.reset()

    this.startNodes()
    await this.flush()

    let steps = 0
    while (!this.finished) {
      const event = this.queue.shift()
      if (!event)
        break

      if (++steps > this.config.maxSteps)
        throw new Error(`simulation did not terminate within ${this.config.maxSteps} steps`)

      this.time = event.time
      event.run()

      await this.flush()
    }

    if (this.failure !== undefined)
      throw this.failure
  }

  private async startNodes() {
    const { onStart } = this.config.algorithm.events ?? {}
    if (!onStart)
      return

    for (const node of this.nodes) {
      try {
        await onStart.call(node.self, this.config.params)
      }
      catch (error) {
        this.noteError(node.id, error)
      }
    }
  }

  private noteError(id: number, error: unknown) {
    if (error instanceof AbortError)
      return

    this.logs.push(`[${this.timestamp()}] ${id} threw: ${error}`)
    this.failure ??= error
    this.finished = true
  }

  private callHook<NameT extends HookKeys<SimulatorHooks<NodeMetaT>>>(
    name: NameT,
    ...args: Parameters<InferCallback<SimulatorHooks<NodeMetaT>, NameT>> extends [SimulatorHookContext<NodeMetaT>, ...infer ArgsT] ? ArgsT : never
  ) {
    return this.hooks.callHook(name, this.hookContext(), ...args as never)
  }

  private hookContext(): SimulatorHookContext<NodeMetaT> {
    return {
      simulator: this,
      finish: () => {
        this.finished = true
      },
    }
  }

  getLogs(): string[] {
    return this.logs
  }

  getTime(): number {
    return this.time
  }

  private timestamp() {
    return this.time.toFixed(1).padStart(8, ' ')
  }

  private flush() {
    // flush the microtask queue
    return new Promise(resolve => setTimeout(resolve, 0))
  }
}
