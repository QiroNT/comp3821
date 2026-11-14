import type { Algorithm } from '@leader-eval/framework'
import { progress } from '@clack/prompts'
import { bully } from '@leader-eval/bully'
import { paxos } from '@leader-eval/paxos'
import { raft } from '@leader-eval/raft'
import incrmeanstdev from '@stdlib/stats/incr/meanstdev'
import { simulateCloudping } from '..'
import { regionsDefault } from '../cloudping'

const regions = regionsDefault
const loops = 10

async function iter(name: string, algo: Algorithm) {
  const p = progress({ max: loops })
  p.start(`Measuring ${name}`)

  const sample = incrmeanstdev()

  for (let i = 0; i < loops; i++) {
    const r = await simulateCloudping(algo, regions)
    sample(r.time)

    p.advance(1, `Measuring ${name} (${i + 1}/${loops})`)
  }

  const [mean, stdev] = Array.from(sample()!)

  p.stop(`${name}: ${mean.toFixed(2)}ms +/- ${stdev.toFixed(2)}`)
}

await iter('bully', bully)
await iter('paxos', paxos)
await iter('raft', raft)
