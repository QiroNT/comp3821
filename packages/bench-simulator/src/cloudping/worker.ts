import type { Algorithm } from '@leader-eval/framework'
import type { RegionName } from './latency'
import { Network, Simulator } from '@leader-eval/framework'
import { Random } from 'random'
import { algorithms } from '../algorithm'
import { cloudpingLatency } from './latency'

export async function simulateCloudping(algorithm: Algorithm, regions: RegionName[]) {
  const random = new Random()
  const cp = cloudpingLatency(random)

  const network = new Network<RegionName>()
  for (const region of random.shuffle(regions))
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
    disableLog: true,
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

interface TaskParam {
  name: string
  regions: RegionName[]
}

export default async ({ name, regions }: TaskParam) => {
  if (!(name in algorithms))
    throw new Error(`Unknown algorithm ${name}`)
  const algorithm = algorithms[name as keyof typeof algorithms]

  return simulateCloudping(algorithm, regions)
}
