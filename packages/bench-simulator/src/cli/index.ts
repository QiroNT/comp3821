import type { Algorithm } from '@leader-eval/framework'
import type { RegionName } from '../cloudping'
import { log, progress } from '@clack/prompts'
import { bully } from '@leader-eval/bully'
import { paxos } from '@leader-eval/paxos'
import { raft } from '@leader-eval/raft'
import incrmeanstdev from '@stdlib/stats/incr/meanstdev'
import { simulateCloudping } from '..'
import { regionsAll, regionsDefault } from '../cloudping'

const loops = 200

async function each(name: string, algo: Algorithm, regions: RegionName[]) {
  const p = progress({ max: loops })
  p.start(`Measuring ${name}`)

  const sampleTime = incrmeanstdev()
  const sampleMsg = incrmeanstdev()

  for (let i = 0; i < loops; i++) {
    const r = await simulateCloudping(algo, regions)
    sampleTime(r.time)
    sampleMsg(r.msgCount)

    p.advance(1, `Measuring ${name} (${i + 1}/${loops})`)
  }

  p.clear()

  const [meanT, stdevT] = Array.from(sampleTime()!)
  const [meanM, stdevM] = Array.from(sampleMsg()!)

  log.info([
    `${name}:`,
    `time: ${meanT.toFixed(2)}ms, stddev ${stdevT.toFixed(2)}`,
    `message: ${meanM.toFixed(2)}, stddev ${stdevM.toFixed(2)}`,
  ].join('\n'))
}

async function iter(regions: RegionName[]) {
  await each('bully', bully, regions)
  await each('paxos', paxos, regions)
  await each('raft', raft, regions)
}

log.info(`Testing default regions (${regionsDefault.length} nodes)`)
await iter(regionsDefault)

log.info(`Testing all regions (${regionsAll.length} nodes)`)
await iter(regionsAll)

const regionsSkewed = [
  ...Array.from<RegionName>({ length: 19 }).fill('us-east-1'),
  ...Array.from<RegionName>({ length: 1 }).fill('eu-west-1'),
]
log.info(`Testing 95%/5% regions (${regionsSkewed.length} nodes)`)
await iter(regionsSkewed)

const regionsSingle = Array.from<RegionName>({ length: 100 }).fill('us-east-1')
log.info(`Testing single region (${regionsSingle.length} nodes)`)
await iter(regionsSingle)
