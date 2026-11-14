import type { RegionName } from '../cloudping/latency'
import { stdout } from 'node:process'
import { isTTY, log, progress } from '@clack/prompts'
import incrmeanstdev from '@stdlib/stats/incr/meanstdev'
import { Tinypool } from 'tinypool'
import { algorithms } from '../algorithm'
import { regionsAll, regionsDefault } from '../cloudping/latency'
import { measurements, openDb } from './db'

const loops = 200
const multiplies = [
  1,
  2,
  4,
  8,
  12,
  16,
  24,
  32,
  48,
  64,
  80,
  96,
  112,
  128,
]

const startedAt = Date.now()
const db = openDb()
const pool = new Tinypool({
  filename: new URL('../cloudping/worker.ts', import.meta.url),
})

async function each(
  dataset: string,
  algorithm: string,
  regions: RegionName[],
  multiplier: number,
) {
  const header = `Measuring ${algorithm} ${multiplier}x`
  const p = isTTY(stdout)
    ? progress({ max: loops })
    : undefined
  p?.start(header)

  const sampleTime = incrmeanstdev()
  const sampleMsg = incrmeanstdev()

  let count = 0
  const rows: (typeof measurements.$inferInsert)[] = []
  const promises = []
  for (let i = 0; i < loops; i++) {
    const promise = pool.run({ name: algorithm, regions }).then((r) => {
      sampleTime(r.time)
      sampleMsg(r.msgCount)

      rows.push({
        dataset,
        startedAt,
        algorithm,
        multiplier,
        nodes: regions.length,
        run: i,
        time: r.time,
        msgCount: r.msgCount,
      })

      p?.advance(1, `${header} (${++count}/${loops})`)
    })
    promises.push(promise)
  }
  await Promise.all(promises)

  rows.sort((a, b) => a.run - b.run)
  db.insert(measurements).values(rows).run()

  p?.clear()

  const [meanT, stddevT] = Array.from(sampleTime()!)
  const [meanM, stddevM] = Array.from(sampleMsg()!)

  log.info([
    `${algorithm} ${multiplier}x:`,
    `time: ${meanT.toFixed(2)}ms, stddev ${stddevT.toFixed(2)}`,
    `message: ${meanM.toFixed(2)}, stddev ${stddevM.toFixed(2)}`,
  ].join('\n'))
}

async function iter(dataset: string, regions: RegionName[]) {
  log.info(`Testing ${dataset} regions (${regions.length} nodes)`)

  for (const m of multiplies) {
    const r = Array.from({ length: m }).fill(0).map(() => regions).flat()

    for (const name of Object.keys(algorithms))
      await each(dataset, name, r, m)
  }
}

await iter('default', regionsDefault)

await iter('all', regionsAll)

const regionsSkewed = [
  ...Array.from<RegionName>({ length: 19 }).fill('us-east-1'),
  ...Array.from<RegionName>({ length: 1 }).fill('eu-west-1'),
]
await iter('skewed', regionsSkewed)

const regionsSingle = Array.from<RegionName>({ length: 20 }).fill('us-east-1')
await iter('single', regionsSingle)

await pool.destroy()
