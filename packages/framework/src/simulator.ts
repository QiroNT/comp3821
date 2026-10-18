import type { Algorithm, NodeRef, NodeThis, RpcResponse } from './algorithm'
import type { Network } from './network'
import type { MaybePromise } from './util'

interface Scheduled {
  time: number
  run: () => void
}

class AbortError extends Error { }

// if the result has not settled over this many messages then there's something
// very wrong with the algorithm code
const MAX_STEPS = 100_000

export class Simulator {
  private nodes: NodeThis[] = []

  private time = 0
  private logs: string[] = []

  private queue: Scheduled[] = []
  private inFlight = new Map<number, Set<() => void>>()
  private leaders = new Map<number, number>()

  private finished = false
  private failure?: unknown

  constructor(
    private algorithm: Algorithm,
    private network: Network,
    private timeout: number,
  ) { }

  reset() {
    this.nodes = this.network.nodes.map((_, id) => this.createNode(id))
    for (const node of this.nodes)
      node.network = this.nodes.map(target => this.createRef(node, target))

    this.time = 0
    this.logs = []

    this.queue = []
    this.inFlight = new Map()
    this.leaders = new Map()

    this.finished = false
    this.failure = undefined
  }

  private createNode(id: number): NodeThis {
    return {
      id,
      network: [],
      abortOutstanding: () => {
        this.abortOutstanding(id)
      },
      assertLeader: (leader) => {
        this.recordLeader(id, leader)
      },

      callAll: (nodes, rpc, ...args) =>
        Promise.all(nodes.map(target => target.call(rpc, ...args))),
    }
  }

  private abortOutstanding(id: number) {
    const pending = this.inFlight.get(id)
    if (!pending?.size)
      return

    this.inFlight.set(id, new Set())

    for (const abort of pending) {
      abort()
    }
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

  private createRef(self: NodeThis, other: NodeThis): NodeRef {
    return {
      id: other.id,
      call: (rpc, ...args) => {
        const label = rpc.name || 'rpc'
        // eslint-disable-next-line no-async-promise-executor
        return this.send(self, other, label, sender => new Promise(async (resolve) => {
          const reply = (response: any) =>
            this.send(other, self, `${label} reply`, (sender, target) => {
              resolve({ target: sender, status: 'ok', response })
              return { target, status: 'ok', response: undefined }
            })

          try {
            await rpc.call(other, { sender, reply }, ...args)
          }
          catch (error) {
            this.noteError(other.id, error)
          }
        }))
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
      this.time + this.timeout,
      () => ({ target, status: 'timeout' } satisfies RpcResponse<T>),
    )

    // schedule the actual response
    const response = this.scheduleAbort(
      from,
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
    const a = this.network.nodes[from.id]
    const b = this.network.nodes[to.id]

    const link = [...a.neighbors].find(neighbor => neighbor.node === b)
    if (!link)
      throw new Error(`node ${from} tried to call non-neighboring node ${to}`)

    return link.latency(a, b)
  }

  private scheduleAbort<T>(node: NodeThis, at: number, f: () => T): Promise<Awaited<T>> {
    return new Promise((resolve, reject) => {
      let settled = false
      const abort = () => {
        if (settled)
          return
        settled = true
        this.inFlight.get(node.id)?.delete(abort)

        reject(new AbortError())
      }

      let pending = this.inFlight.get(node.id)
      if (!pending) {
        pending = new Set()
        this.inFlight.set(node.id, pending)
      }
      pending.add(abort)

      this.at(at, async () => {
        // we still run the content even when it's aborted, just not returning it
        const r = Promise.resolve(f())
        r.catch((error) => {
          this.noteError(node.id, error)
        })

        if (settled)
          return
        settled = true
        this.inFlight.get(node.id)?.delete(abort)

        resolve(await r)
      })
    })
  }

  private schedule<T>(at: number, f: () => T): Promise<T> {
    return new Promise((resolve) => {
      this.at(at, () => {
        resolve(f())
      })
    })
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

    const { onRecovery } = this.algorithm.events ?? {}
    if (onRecovery) {
      for (const node of this.nodes)
        this.startNode(node, onRecovery)
    }

    let steps = 0
    while (!this.finished) {
      // flush the microtask queue
      await new Promise(resolve => setTimeout(resolve, 0))

      const event = this.queue.shift()
      if (!event)
        break

      if (++steps > MAX_STEPS)
        throw new Error(`simulation did not terminate within ${MAX_STEPS} steps`)

      this.time = event.time
      event.run()
    }

    if (this.failure !== undefined)
      throw this.failure
  }

  private async startNode(
    node: NodeThis,
    f: (this: NodeThis) => MaybePromise<void>,
  ) {
    try {
      await f.call(node)
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
}
