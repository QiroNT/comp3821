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
  A extends unknown[],
  R,
  F extends (this: NodeThis, ...args: A) => R,
>(f: F): F {
  return f
}

export type NodeThis = Record<string, any> & {
  id: number
  network: NodeRef[]
  abortOutstanding: () => void
  assertLeader: (leader?: NodeRef | NodeThis) => void

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
  onCheck?: (this: NodeThis) => void
  onRecovery?: (this: NodeThis) => void
  onTimeout?: (this: NodeThis) => void
}

export interface Algorithm {
  rpcs?: Rpc<unknown[], unknown>[]
  events?: AlgorithmEvents
}
