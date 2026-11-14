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
      replyTimeout: 5_000,
      checkInterval: 10_000,
      checkTimeout: 30_000,
    },
    maxSteps: 10 * regions.length ** 2,
  })

  await simulator.run()

  return {
    time: simulator.getTime(),
  }
}
