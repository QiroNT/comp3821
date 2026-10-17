import type { Algorithm } from './algorithm'
import type { Network } from './network'

export class Simulator {
  constructor(
    private algorithm: Algorithm,
    private network: Network,
  ) { }

  reset() { }

  run() { }

  log(): string {
    // returns a log of all rpcs and assertLeaders
    return ''
  }
}
