import type { RegionName } from '../cloudping/latency'
import { stdout } from 'node:process'
import { isTTY, log, progress } from '@clack/prompts'
import incrmeanstdev from '@stdlib/stats/incr/meanstdev'
import { Tinypool } from 'tinypool'
import { algorithms } from '../algorithm'
import { regionsAll, regionsDefault } from '../cloudping/latency'

const loops = 200

const pool = new Tinypool({
  filename: new URL('../cloudping/worker.ts', import.meta.url),
})

async function each(name: string, regions: RegionName[]) {
  const p = isTTY(stdout)
    ? progress({ max: loops })
    : undefined
  p?.start(`Measuring ${name}`)

  const sampleTime = incrmeanstdev()
  const sampleMsg = incrmeanstdev()

  let count = 0
  const promises = []
  for (let i = 0; i < loops; i++) {
    const promise = pool.run({ name, regions }).then((r) => {
      sampleTime(r.time)
      sampleMsg(r.msgCount)

      p?.advance(1, `Measuring ${name} (${++count}/${loops})`)
    })
    promises.push(promise)
  }
  await Promise.all(promises)

  p?.clear()

  const [meanT, stddevT] = Array.from(sampleTime()!)
  const [meanM, stddevM] = Array.from(sampleMsg()!)

  log.info([
    `${name}:`,
    `time: ${meanT.toFixed(2)}ms, stddev ${stddevT.toFixed(2)}`,
    `message: ${meanM.toFixed(2)}, stddev ${stddevM.toFixed(2)}`,
  ].join('\n'))
}

async function iter(regions: RegionName[]) {
  for (const name of Object.keys(algorithms))
    await each(name, regions)
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

const regionsSingle = Array.from<RegionName>({ length: 200 }).fill('us-east-1')
log.info(`Testing single region (${regionsSingle.length} nodes)`)
await iter(regionsSingle)

await pool.destroy()
