import type { MaybePromise } from './util'

export interface Request<R> {
  sender: NodeRef
  reply: [R] extends [undefined]
    ? (reply?: R) => Promise<RpcResponse<undefined>>
    : (reply: R) => Promise<RpcResponse<undefined>>
}

export type Rpc<A extends unknown[], R> = (
  this: NodeThis,
  context: Request<R>,
  ...args: A
) => MaybePromise<void>

export type RpcResponse<T> = {
  target: NodeRef
} & ({
  status: 'timeout'
  response?: undefined
} | {
  status: 'ok'
  response: T
})

export function rpc<R = undefined>() {
  return <A extends unknown[]>(f: Rpc<A, R>) => f
}

export function fn<
  F extends (this: NodeThis, ...args: any[]) => any,
>(f: F): F {
  return f
}

export type NodeThis = Record<string, any> & {
  id: number
  network: NodeRef[]
  params: Record<string, any>

  abortOutstanding: () => number
  assertLeader: (leader?: NodeRef | NodeThis) => void

  setTimeout: (f: (this: NodeThis) => MaybePromise<void>, delay: number) => number
  clearTimeout: (handle?: number) => void

  callAll: <A extends unknown[], R>(
    nodes: NodeRef[],
    rpc: Rpc<A, R>,
    ...args: A
  ) => Promise<RpcResponse<R>[]>
}

export type NodeRef = Record<string, any> & {
  id: number
  call: <A extends unknown[], R>(
    rpc: Rpc<A, R>,
    ...args: A
  ) => Promise<RpcResponse<R>>
}

export interface AlgorithmEvents {
  onStart?: (this: NodeThis, config: Record<string, any>) => MaybePromise<void>
}

export interface Algorithm {
  rpcs?: Rpc<unknown[], unknown>[]
  events?: AlgorithmEvents
}
