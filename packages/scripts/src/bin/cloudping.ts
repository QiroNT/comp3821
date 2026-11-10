import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PERCENTILES = [
  'p_10',
  'p_25',
  'p_50',
  'p_75',
  'p_90',
  'p_98',
  'p_99',
]

const assets = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../assets')

await mkdir(assets, { recursive: true })

await Promise.all(PERCENTILES.map(async (percentile) => {
  const url = new URL('https://api.cloudping.co/latencies')
  url.searchParams.set('timeframe', '1M')
  url.searchParams.set('percentile', percentile)

  const res = await fetch(url)

  if (!res.ok)
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`)

  const body = await res.text()

  // check that the endpoint isn't lying
  JSON.parse(body)

  const file = resolve(assets, `cloudping-1M-${percentile}.json`)
  await writeFile(file, body)
}))
