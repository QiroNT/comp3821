import type { Random } from 'random'
import assert from 'node:assert/strict'
import quantile from '@stdlib/stats/base/dists/normal/quantile'
import p_10 from '../../../assets/cloudping/1M-p_10.json'
import p_25 from '../../../assets/cloudping/1M-p_25.json'
import p_50 from '../../../assets/cloudping/1M-p_50.json'
import p_75 from '../../../assets/cloudping/1M-p_75.json'
import p_90 from '../../../assets/cloudping/1M-p_90.json'
import p_98 from '../../../assets/cloudping/1M-p_98.json'
import p_99 from '../../../assets/cloudping/1M-p_99.json'

export type RegionName = keyof typeof p_10['data']
export const regionsAll = Object.keys(p_10.data) as RegionName[]
export const regionsDefault = [ // probably what most ppl uses
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ca-central-1',
  'eu-central-1',
  'eu-north-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'sa-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
] as const satisfies RegionName[]

const percentiles = [
  p_10,
  p_25,
  p_50,
  p_75,
  p_90,
  p_98,
  p_99,
]

percentiles
  .map(p => new Set(Object.keys(p.data)))
  .reduce((acc, curr) => {
    assert(acc.difference(curr).size === 0, 'Percentiles have different regions')
    return curr
  })

// inverse transform sampling

// standard score of each percentile
const scores = percentiles.map((p) => {
  const level = Number.parseInt(p.metadata.percentile.replace('p_', '')) / 100
  return quantile(level, 0, 1)
})

// log latency at each percentile
const knots = new Map<string, number[]>()
for (const from of regionsAll) {
  for (const to of regionsAll) {
    const latencies = percentiles.map(p => p.data[from][to])

    assert(
      latencies.every(t => t > 0),
      `Non-positive latency for ${from} -> ${to}`,
    )
    assert(
      latencies.every((t, i) => i === 0 || latencies[i - 1] <= t),
      `Non-monotonic percentiles for ${from} -> ${to}`,
    )

    knots.set(`${from}/${to}`, latencies.map(Math.log))
  }
}

export function cloudping(random: Random) {
  const normal = random.normal()

  return (from: RegionName, to: RegionName) => {
    const latencies = knots.get(`${from}/${to}`)
    assert(latencies, `No latency data for ${from} -> ${to}`)

    const score = normal()

    // find the segment containing the score
    let i = 0
    while (i < scores.length - 2 && score > scores[i + 1])
      i++

    // linear interpolation
    const t = (score - scores[i]) / (scores[i + 1] - scores[i])
    const roundtrip = Math.exp(latencies[i] + t * (latencies[i + 1] - latencies[i]))

    // we don't have oneway time, unfortunately
    return roundtrip / 2
  }
}
