import type { Algorithm, NodeRef, NodeThis, RpcResponse } from './algorithm'
import type { Network } from './network'
import type { MaybePromise } from './util'
import { Random } from 'random'

interface Scheduled {
  time: number
  run: () => void
}

interface Abortable {
  abort: () => void
}

class AbortError extends Error { }

interface SimulatorConfig {
  algorithm: Algorithm
  network: Network
  params: Record<string, any> & {
    replyTimeout: number
  }
  maxSteps: number
  seed?: number | string
}

export class Simulator {
  private nodes: NodeThis[] = []

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
    private config: SimulatorConfig,
  ) { }

  reset() {
    const { nodes } = this.config.network
    this.nodes = nodes.map((_, id) => this.createNode(id))

    for (const node of this.nodes) {
      const neighbors = new Set([...nodes[node.id].neighbors]
        .map(n => nodes.indexOf(n.node)))

      node.network = [...neighbors]
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

  private createNode(id: number): NodeThis {
    return {
      id,
      network: [],
      params: this.config.params,
      abortOutstanding: () => this.abortOutstanding(id),
      assertLeader: (leader) => {
        this.recordLeader(id, leader)
      },

      setTimeout: (f, delay) => this.setTimeout(id, f, delay),
      clearTimeout: (handle) => {
        if (handle !== undefined)
          this.timers.get(id)?.delete(handle)
      },

      random: new Random(`${this.config.seed}/${id}`),

      callAll: (nodes, rpc, ...args) =>
        Promise.all(nodes.map(target => target.call(rpc, ...args))),
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

  private recordLeader(id: number, leader?: NodeRef | NodeThis) {
    if (leader) {
      this.leaders.set(id, leader.id)
    }
    else {
      this.leaders.delete(id)
    }
    this.logs.push(`[${this.timestamp()}] ${id} assertLeader(${leader?.id})`)

    // stop once every node agrees on the same leader
    const agreed = this.leaders.get(0)
    if (agreed !== undefined && this.nodes.every(node => this.leaders.get(node.id) === agreed)) {
      this.finished = true
      this.logs.push(`[${this.timestamp()}] leader settled: ${agreed}`)
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
        await f.call(node)
      }
      catch (error) {
        note(error instanceof AbortError ? 'aborted' : 'errored')
        this.noteError(id, error)
      }
    })

    return handle
  }

  private createRef(self: NodeThis, other: NodeThis): NodeRef {
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
          sender => new Promise(async (resolve) => {
            const reply = (response: any) =>
              this.send(
                other,
                self,
                `${name} reply(${JSON.stringify(response)})`,
                (sender, target) => {
                  resolve({ target: sender, status: 'ok', response })
                  return { target, status: 'ok', response: undefined }
                },
              )

            try {
              await rpc.call(other, { sender, reply }, ...args)
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
    from: NodeThis,
    to: NodeThis,
    label: string,
    f: (sender: NodeRef, target: NodeRef) => MaybePromise<RpcResponse<T>>,
  ): Promise<RpcResponse<T>> {
    const latency = this.latency(from, to)

    const logLine = this.logs.length
    this.logs.push(`[${this.timestamp()}] ${from.id} -> ${to.id} ${label}`)
    const note = (text: string) => {
      this.logs[logLine] += ` ${text}`
    }

    const sender = to.network.find(ref => ref.id === from.id)!
    const target = from.network.find(ref => ref.id === to.id)!

    // we treat invalid latencies as disconnected
    if (!Number.isFinite(latency)) {
      note('timeout')
      return Promise.resolve({ target, status: 'timeout' })
    }

    // schedule a timeout response
    const timeout = this.schedule(
      this.time + this.config.params.replyTimeout,
      () => ({ target, status: 'timeout' } satisfies RpcResponse<T>),
    )

    // schedule the actual response
    const response = this.scheduleAbortable(
      from.id,
      this.time + Math.max(0, latency),
      () => f(sender, target),
    )

    const ret = Promise.race([timeout, response])
    ret
      .then((res) => {
        note(res.status)
      })
      .catch((error) => {
        note(error instanceof AbortError ? 'aborted' : 'errored')
        this.noteError(from.id, error)
      })

    return ret
  }

  private latency(from: NodeThis, to: NodeThis): number {
    const a = this.config.network.nodes[from.id]
    const b = this.config.network.nodes[to.id]

    const link = [...a.neighbors].find(neighbor => neighbor.node === b)
    if (!link)
      throw new Error(`node ${from.id} tried to call non-neighboring node ${to.id}`)

    return link.latency(a, b)
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
      const r = Promise.resolve(f(settled))
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

    const { onStart } = this.config.algorithm.events ?? {}
    if (onStart) {
      for (const node of this.nodes)
        this.startNode(node, onStart)
    }

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

  private async startNode(
    node: NodeThis,
    f: (this: NodeThis, config: Record<string, any>) => MaybePromise<void>,
  ) {
    try {
      await f.call(node, this.config.params)
    }
    catch (error) {
      this.noteError(node.id, error)
    }
  }

  private noteError(id: number, error: unknown) {
    if (error instanceof AbortError)
      return

    this.logs.push(`[${this.timestamp()}] ${id} threw: ${error}`)
    this.failure ??= error
    this.finished = true
  }

  log(): string[] {
    return this.logs
  }

  private timestamp() {
    return this.time.toFixed(1).padStart(8, ' ')
  }

  private flush() {
    // flush the microtask queue
    return new Promise(resolve => setTimeout(resolve, 0))
  }
}
