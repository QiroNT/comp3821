import type { Hookable, HookKeys, InferCallback } from 'hookable'
import type { Algorithm, NodeRef, NodeThis, Rpc, RpcResponse } from './algorithm'
import type { Network, NetworkNeighbor, NetworkNode } from './network'
import type { MaybePromise } from './util'
import FastPriorityQueue from 'fastpriorityqueue'
import { createHooks } from 'hookable'
import { Random } from 'random'
import { noop } from './util'

interface Scheduled {
  time: number
  seq: number
  run: () => void
}

function createQueue() {
  return new FastPriorityQueue<Scheduled>(
    (a, b) => a.time < b.time || (a.time === b.time && a.seq < b.seq),
  )
}

// for debugging, add `extends Error`
class AbortError { }

class Exchange<T> {
  private waiter: PromiseWithResolvers<RpcResponse<T>> | undefined = Promise.withResolvers()
  private settled = false

  constructor(
    private pending: Set<Exchange<unknown>>,
    private note: (append: string) => void,
    private noteError: (error: unknown) => void,
    readonly senderRef: NodeRef,
    readonly targetRef: NodeRef,
    private f: ((senderRef: NodeRef, targetRef: NodeRef) => MaybePromise<RpcResponse<T>>) | undefined,
  ) {
    pending.add(this as Exchange<unknown>)
  }

  get promise() {
    return this.waiter!.promise
  }

  timeout() {
    this.finish({ target: this.targetRef, status: 'timeout' })
  }

  async respond() {
    const { f, senderRef, targetRef } = this
    this.f = undefined

    // we still run the content even when it's aborted, just not returning it
    const result = Promise.try(f!, senderRef, targetRef)
    result.catch(this.noteError)

    if (this.settle())
      this.finish(await result)
  }

  abort() {
    if (!this.settle() || !this.waiter)
      return

    const { promise, reject } = this.waiter
    this.waiter = undefined

    promise.catch(noop)

    this.note('aborted')
    reject(new AbortError())
  }

  private settle() {
    if (this.settled)
      return false

    this.settled = true
    this.pending.delete(this as Exchange<unknown>)
    return true
  }

  private finish(response: RpcResponse<T>) {
    if (!this.waiter)
      return

    const { resolve } = this.waiter
    this.waiter = undefined

    this.note(response.status)
    resolve(response)
  }
}

interface SimulatorNode<NodeMetaT> {
  id: number
  self: NodeThis
  netNode: NetworkNode<NodeMetaT>
  links: NetworkNeighbor<NodeMetaT>[]
  refs: NodeRef[]
  inFlight: Set<Exchange<unknown>>
}

export interface SimulatorConfig<NodeMetaT> {
  algorithm: Algorithm
  network: Network<NodeMetaT>
  params: Record<string, any> & {
    replyTimeout: number
  }
  maxSteps: number
  seed?: number | string
  disableLog?: boolean
}

export interface SimulatorHookContext<NodeMetaT> {
  simulator: Simulator<NodeMetaT>
  finish: () => void
}

export interface SimulatorHooks<NodeMetaT> {
  'rpc:call': (ctx: SimulatorHookContext<NodeMetaT>, f: Rpc<any[], any>, caller: NetworkNode<NodeMetaT>, callee: NetworkNode<NodeMetaT>) => MaybePromise<void>
  'rpc:reply': (ctx: SimulatorHookContext<NodeMetaT>, f: Rpc<any[], any>, caller: NetworkNode<NodeMetaT>, callee: NetworkNode<NodeMetaT>) => MaybePromise<void>
  'leader:assert': (ctx: SimulatorHookContext<NodeMetaT>, node: NetworkNode<NodeMetaT>, leader?: NetworkNode<NodeMetaT>) => MaybePromise<void>
  'leader:consent': (ctx: SimulatorHookContext<NodeMetaT>, leader: NetworkNode<NodeMetaT>) => MaybePromise<void>
}

export class Simulator<NodeMetaT> {
  public hooks: Hookable<SimulatorHooks<NodeMetaT>> = createHooks()

  private nodes: SimulatorNode<NodeMetaT>[] = []

  private time = 0
  private logs: string[] = []

  private queue = createQueue()
  private seq = 0

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

    const ids = new Map(nodes.map((node, id) => [node, id]))
    for (const node of this.nodes)
      this.connect(node, ids)

    this.time = 0
    this.logs = []

    this.queue = createQueue()
    this.timers = new Map()
    this.leaders = new Map()

    this.finished = false
    this.failure = undefined
  }

  private connect(
    node: SimulatorNode<NodeMetaT>,
    ids: Map<NetworkNode<NodeMetaT>, number>,
  ) {
    for (const link of node.netNode.neighbors) {
      const id = ids.get(link.node)!
      node.links[id] = link
    }

    node.self.network = []
    node.links.forEach((_, id) => {
      const ref = this.createRef(node, this.nodes[id])
      node.refs[id] = ref
      node.self.network.push(ref)
    })
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
      links: [],
      refs: [],
      inFlight: new Set(),
    }
  }

  private abortOutstanding(id: number): number {
    const { inFlight } = this.nodes[id]
    const aborted = inFlight.size

    for (const exchange of inFlight)
      exchange.abort()

    return aborted
  }

  private assertLeader(id: number, leader?: NodeRef | NodeThis) {
    if (leader) {
      this.leaders.set(id, leader.id)
    }
    else {
      this.leaders.delete(id)
    }
    this.logLine(`${id} assertLeader(${leader?.id})`)
    this.callHook(
      'leader:assert',
      this.nodes[id].netNode,
      leader ? this.nodes[leader.id].netNode : undefined,
    )

    // stop once every node agrees on the same leader
    const agreed = this.leaders.get(0)
    if (agreed !== undefined && this.nodes.every(node => this.leaders.get(node.id) === agreed)) {
      this.finished = true
      this.logLine(`leader settled: ${agreed}`)
      this.callHook('leader:consent', this.nodes[agreed].netNode)
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

      const note = this.logLine(`${id} ${f.name || 'timeout'}`)

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
            this.callHook('rpc:call', rpc, self.netNode, other.netNode)

            const reply = (response: any) => {
              this.callHook('rpc:reply', rpc, self.netNode, other.netNode)

              return this.send(
                other,
                self,
                `${name} reply(${JSON.stringify(response)})`,
                (senderRef, targetRef) => {
                  resolve({ target: senderRef, status: 'ok', response })
                  return { target: targetRef, status: 'ok', response: undefined }
                },
              )
            }

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

    const note = this.logLine(`${from.id} -> ${to.id} ${label}`)

    const senderRef = to.refs[from.id]
    const targetRef = from.refs[to.id]

    // we treat invalid latencies as disconnected
    if (!Number.isFinite(latency)) {
      note('timeout')
      return Promise.resolve({ target: targetRef, status: 'timeout' })
    }

    const exchange = new Exchange<T>(
      from.inFlight,
      note,
      error => this.noteError(from.id, error),
      senderRef,
      targetRef,
      f,
    )

    // schedule a timeout and the response
    this.at(
      this.time + this.config.params.replyTimeout,
      exchange.timeout.bind(exchange),
    )
    this.at(
      this.time + Math.max(0, latency),
      exchange.respond.bind(exchange),
    )

    return exchange.promise
  }

  private latency(
    from: SimulatorNode<NodeMetaT>,
    to: SimulatorNode<NodeMetaT>,
  ): number {
    const link = from.links[to.id]
    if (!link)
      throw new Error(`node ${from.id} tried to call non-neighboring node ${to.id}`)

    return link.latency(from.netNode, to.netNode)
  }

  private at(time: number, run: () => void) {
    if (time === Infinity)
      return

    this.queue.add({ time, seq: this.seq++, run })
  }

  async run() {
    this.reset()

    this.startNodes()
    await this.flush()

    await new Promise<void>((resolve, reject) => {
      let steps = 0
      let done = false

      const step = () => {
        if (done)
          return

        const event = this.finished
          ? undefined
          : this.queue.poll()
        if (!event) {
          done = true
          return resolve()
        }

        if (++steps > this.config.maxSteps) {
          done = true
          return reject(new Error(`simulation did not terminate within ${this.config.maxSteps} steps`))
        }

        this.time = event.time
        event.run()
      }

      const batch = () => {
        for (let i = 0; i < 1024; i++)
          setImmediate(step)
        setImmediate(() => done || batch())
      }
      batch()
    })

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

    this.logLine(`${id} threw: ${error}`)
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

  private logLine(log: string): (append: string) => void {
    if (this.config.disableLog)
      return noop

    const line = this.logs.length
    this.logs.push(`[${this.timestamp()}] ${log}`)

    return (append: string) => {
      this.logs[line] += ` ${append}`
    }
  }

  private timestamp() {
    return this.time.toFixed(1).padStart(8, ' ')
  }

  private flush() {
    // flush the microtask queue
    return new Promise(resolve => setImmediate(resolve))
  }
}
