import { Network, Simulator } from 'framework'
import { expect, it } from 'vitest'
import { raft } from '../src'

it('should complete in mesh', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode()
  network.fullyConnect(() => 1)

  const simulator = new Simulator({
    algorithm: raft,
    network,
    params: {
      replyTimeout: 100,
      checkInterval: 10,
      checkTimeout: 30,
    },
    maxSteps: 100,
  })

  await simulator.run()

  expect(simulator.log()).toMatchInlineSnapshot(`
    [
      "[    19.0] 1 onTimeout",
      "[    19.0] 1 -> 0 requestVotes(1) ok",
      "[    20.0] 0 -> 1 requestVotes reply(true) ok",
      "[    21.0] 1 -> 2 requestVotes(1) ok",
      "[    22.0] 2 -> 1 requestVotes reply(true) ok",
      "[    23.0] 1 -> 3 requestVotes(1) ok",
      "[    24.0] 3 -> 1 requestVotes reply(true) ok",
      "[    25.0] 0 onTimeout",
      "[    25.0] 0 -> 1 requestVotes(2) ok",
      "[    25.0] 1 -> 4 requestVotes(1) ok",
      "[    26.0] 1 -> 0 requestVotes reply(true) ok",
      "[    26.0] 4 -> 1 requestVotes reply(true) ok",
      "[    27.0] 0 -> 2 requestVotes(2)",
      "[    27.0] 1 -> 0 appendEntry(2)",
      "[    27.0] 1 -> 2 appendEntry(2)",
      "[    27.0] 1 -> 3 appendEntry(2)",
      "[    27.0] 1 -> 4 appendEntry(2)",
      "[    27.0] 1 assertLeader(1)",
      "[    28.0] 2 -> 0 requestVotes reply(true)",
      "[    28.0] 0 assertLeader(1)",
      "[    28.0] 0 -> 1 appendEntry reply(true)",
      "[    28.0] 2 assertLeader(1)",
      "[    28.0] 2 -> 1 appendEntry reply(true)",
      "[    28.0] 3 assertLeader(1)",
      "[    28.0] 3 -> 1 appendEntry reply(true)",
      "[    28.0] 4 assertLeader(1)",
      "[    28.0] leader settled: 1",
      "[    28.0] 4 -> 1 appendEntry reply(true)",
    ]
  `)

  const settled = simulator.log().find(line => line.includes('leader settled'))
  expect(settled).toMatch(/leader settled: \d+$/)
})

it('should not conclude if it forever timeouts', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode()
  network.fullyConnect(() => 100)

  const simulator = new Simulator({
    algorithm: raft,
    network,
    params: {
      replyTimeout: 1,
      checkInterval: 10,
      checkTimeout: 30,
    },
    maxSteps: 100,
  })

  await expect(simulator.run())
    .rejects
    .toThrow('simulation did not terminate')

  expect(simulator.log()).toMatchInlineSnapshot(`
    [
      "[    19.0] 1 onTimeout",
      "[    19.0] 1 -> 0 requestVotes(1) timeout",
      "[    20.0] 1 -> 2 requestVotes(1) timeout",
      "[    21.0] 1 -> 3 requestVotes(1) timeout",
      "[    22.0] 1 -> 4 requestVotes(1) timeout",
      "[    25.0] 0 onTimeout",
      "[    25.0] 0 -> 1 requestVotes(1) timeout",
      "[    26.0] 0 -> 2 requestVotes(1) timeout",
      "[    27.0] 0 -> 3 requestVotes(1) timeout",
      "[    28.0] 0 -> 4 requestVotes(1) timeout",
      "[    30.0] 3 onTimeout",
      "[    30.0] 3 -> 0 requestVotes(1) timeout",
      "[    31.0] 3 -> 1 requestVotes(1) timeout",
      "[    32.0] 3 -> 2 requestVotes(1) timeout",
      "[    33.0] 3 -> 4 requestVotes(1) timeout",
      "[    34.0] 2 onTimeout",
      "[    34.0] 2 -> 0 requestVotes(1) timeout",
      "[    35.0] 4 onTimeout",
      "[    35.0] 4 -> 0 requestVotes(1) timeout",
      "[    35.0] 2 -> 1 requestVotes(1) timeout",
      "[    36.0] 4 -> 1 requestVotes(1) timeout",
      "[    36.0] 2 -> 3 requestVotes(1) timeout",
      "[    37.0] 4 -> 2 requestVotes(1) timeout",
      "[    37.0] 2 -> 4 requestVotes(1) timeout",
      "[    38.0] 4 -> 3 requestVotes(1) timeout",
      "[    69.0] 1 onTimeout",
      "[    69.0] 1 -> 0 requestVotes(2) timeout",
      "[    70.0] 1 -> 2 requestVotes(2) timeout",
      "[    71.0] 1 -> 3 requestVotes(2) timeout",
      "[    72.0] 1 -> 4 requestVotes(2) timeout",
      "[    84.0] 0 onTimeout",
      "[    84.0] 0 -> 1 requestVotes(2) timeout",
      "[    85.0] 0 -> 2 requestVotes(2) timeout",
      "[    86.0] 0 -> 3 requestVotes(2) timeout",
      "[    87.0] 0 -> 4 requestVotes(2) timeout",
      "[    93.0] 3 onTimeout",
      "[    93.0] 3 -> 0 requestVotes(2) timeout",
      "[    94.0] 3 -> 1 requestVotes(2) timeout",
      "[    95.0] 2 onTimeout",
      "[    95.0] 2 -> 0 requestVotes(2) timeout",
      "[    95.0] 3 -> 2 requestVotes(2) timeout",
      "[    96.0] 2 -> 1 requestVotes(2) timeout",
      "[    96.0] 3 -> 4 requestVotes(2) timeout",
      "[    97.0] 2 -> 3 requestVotes(2) timeout",
      "[    98.0] 4 onTimeout",
      "[    98.0] 4 -> 0 requestVotes(2) timeout",
      "[    98.0] 2 -> 4 requestVotes(2) timeout",
      "[    99.0] 4 -> 1 requestVotes(2) timeout",
      "[   100.0] 4 -> 2 requestVotes(2) timeout",
      "[   101.0] 4 -> 3 requestVotes(2) timeout",
      "[   113.0] 1 onTimeout",
      "[   113.0] 1 -> 0 requestVotes(3) timeout",
      "[   114.0] 1 -> 2 requestVotes(3) timeout",
      "[   115.0] 1 -> 3 requestVotes(3) timeout",
      "[   116.0] 1 -> 4 requestVotes(3) timeout",
      "[   119.0] 0 -> 1 requestVotes reply(false) timeout",
      "[   120.0] 2 -> 1 requestVotes reply(false) timeout",
      "[   121.0] 3 -> 1 requestVotes reply(false) timeout",
      "[   122.0] 4 -> 1 requestVotes reply(false) timeout",
      "[   125.0] 1 -> 0 requestVotes reply(false) timeout",
      "[   126.0] 2 -> 0 requestVotes reply(false) timeout",
      "[   127.0] 3 -> 0 requestVotes reply(false) timeout",
      "[   128.0] 4 -> 0 requestVotes reply(false) timeout",
      "[   130.0] 0 -> 3 requestVotes reply(false) timeout",
      "[   131.0] 1 -> 3 requestVotes reply(false) timeout",
      "[   132.0] 2 -> 3 requestVotes reply(false) timeout",
      "[   133.0] 4 -> 3 requestVotes reply(false) timeout",
      "[   134.0] 0 -> 2 requestVotes reply(false) timeout",
      "[   135.0] 0 -> 4 requestVotes reply(false) timeout",
      "[   135.0] 1 -> 2 requestVotes reply(false) timeout",
      "[   136.0] 1 -> 4 requestVotes reply(false) timeout",
      "[   136.0] 3 -> 2 requestVotes reply(false) timeout",
      "[   137.0] 2 -> 4 requestVotes reply(false)",
      "[   137.0] 4 -> 2 requestVotes reply(false)",
    ]
  `)
})
