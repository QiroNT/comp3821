import type { Algorithm } from '@leader-eval/framework'
import type { RegionName } from './cloudping'
import { Network, Simulator } from '@leader-eval/framework'
import { Random } from 'random'
import { cloudping } from './cloudping'

export async function simulateCloudping(algorithm: Algorithm, regions: RegionName[]) {
  const cp = cloudping(new Random())

  const network = new Network<RegionName>()
  for (const region of regions)
    network.addNode(region)

  network.fullyConnect((from, to) => {
    return cp(from.meta, to.meta)
  })

  const simulator = new Simulator({
    algorithm,
    network,
    params: {
      replyTimeout: 2_000,
      checkInterval: 10_000,
      checkTimeout: 30_000,
    },
    maxSteps: 10 * regions.length ** 3,
    seed: Math.random(),
  })

  let msgCount = 0
  simulator.hooks.hook('rpc:call', () => {
    msgCount++
  })

  await simulator.run()

  return {
    time: simulator.getTime(),
    msgCount,
  }
}
