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
    maxSteps: 200,
  })

  await simulator.run()

  expect(simulator.log()).toMatchInlineSnapshot()

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
      "[    30.0] 0 onTimeout",
      "[    30.0] 0 -> 1 requestVotes timeout",
      "[    30.0] 0 -> 1 requestVotes timeout",
      "[    30.0] 1 onTimeout",
      "[    30.0] 1 -> 0 requestVotes timeout",
      "[    30.0] 1 -> 0 requestVotes timeout",
      "[    30.0] 2 onTimeout",
      "[    30.0] 2 -> 0 requestVotes timeout",
      "[    30.0] 2 -> 0 requestVotes timeout",
      "[    30.0] 3 onTimeout",
      "[    30.0] 3 -> 0 requestVotes timeout",
      "[    30.0] 3 -> 0 requestVotes timeout",
      "[    30.0] 4 onTimeout",
      "[    30.0] 4 -> 0 requestVotes timeout",
      "[    30.0] 4 -> 0 requestVotes timeout",
      "[    31.0] 0 -> 2 requestVotes timeout",
      "[    31.0] 0 -> 2 requestVotes timeout",
      "[    31.0] 1 -> 2 requestVotes timeout",
      "[    31.0] 1 -> 2 requestVotes timeout",
      "[    31.0] 2 -> 1 requestVotes timeout",
      "[    31.0] 2 -> 1 requestVotes timeout",
      "[    31.0] 3 -> 1 requestVotes timeout",
      "[    31.0] 3 -> 1 requestVotes timeout",
      "[    31.0] 4 -> 1 requestVotes timeout",
      "[    31.0] 4 -> 1 requestVotes timeout",
      "[    32.0] 0 -> 3 requestVotes timeout",
      "[    32.0] 0 -> 3 requestVotes timeout",
      "[    32.0] 1 -> 3 requestVotes timeout",
      "[    32.0] 1 -> 3 requestVotes timeout",
      "[    32.0] 2 -> 3 requestVotes timeout",
      "[    32.0] 2 -> 3 requestVotes timeout",
      "[    32.0] 3 -> 2 requestVotes timeout",
      "[    32.0] 3 -> 2 requestVotes timeout",
      "[    32.0] 4 -> 2 requestVotes timeout",
      "[    32.0] 4 -> 2 requestVotes timeout",
      "[    33.0] 0 -> 4 requestVotes timeout",
      "[    33.0] 0 -> 4 requestVotes timeout",
      "[    33.0] 1 -> 4 requestVotes timeout",
      "[    33.0] 1 -> 4 requestVotes timeout",
      "[    33.0] 2 -> 4 requestVotes timeout",
      "[    33.0] 2 -> 4 requestVotes timeout",
      "[    33.0] 3 -> 4 requestVotes timeout",
      "[    33.0] 3 -> 4 requestVotes timeout",
      "[    33.0] 4 -> 3 requestVotes timeout",
      "[    33.0] 4 -> 3 requestVotes timeout",
      "[    64.0] 0 onTimeout",
      "[    64.0] 0 -> 1 requestVotes timeout",
      "[    64.0] 1 onTimeout",
      "[    64.0] 1 -> 0 requestVotes timeout",
      "[    64.0] 2 onTimeout",
      "[    64.0] 2 -> 0 requestVotes timeout",
      "[    64.0] 3 onTimeout",
      "[    64.0] 3 -> 0 requestVotes timeout",
      "[    64.0] 4 onTimeout",
      "[    64.0] 4 -> 0 requestVotes timeout",
      "[    65.0] 0 -> 2 requestVotes timeout",
      "[    65.0] 1 -> 2 requestVotes timeout",
      "[    65.0] 2 -> 1 requestVotes timeout",
      "[    65.0] 3 -> 1 requestVotes timeout",
      "[    65.0] 4 -> 1 requestVotes timeout",
      "[    66.0] 0 -> 3 requestVotes timeout",
      "[    66.0] 1 -> 3 requestVotes timeout",
      "[    66.0] 2 -> 3 requestVotes timeout",
      "[    66.0] 3 -> 2 requestVotes timeout",
      "[    66.0] 4 -> 2 requestVotes timeout",
      "[    67.0] 0 -> 4 requestVotes timeout",
      "[    67.0] 1 -> 4 requestVotes timeout",
      "[    67.0] 2 -> 4 requestVotes timeout",
      "[    67.0] 3 -> 4 requestVotes timeout",
      "[    67.0] 4 -> 3 requestVotes timeout",
      "[    98.0] 0 onTimeout",
      "[    98.0] 0 -> 1 requestVotes timeout",
      "[    98.0] 1 onTimeout",
      "[    98.0] 1 -> 0 requestVotes timeout",
      "[    98.0] 2 onTimeout",
      "[    98.0] 2 -> 0 requestVotes timeout",
      "[    98.0] 3 onTimeout",
      "[    98.0] 3 -> 0 requestVotes timeout",
      "[    98.0] 4 onTimeout",
      "[    98.0] 4 -> 0 requestVotes timeout",
      "[    99.0] 0 -> 2 requestVotes timeout",
      "[    99.0] 1 -> 2 requestVotes timeout",
      "[    99.0] 2 -> 1 requestVotes timeout",
      "[    99.0] 3 -> 1 requestVotes timeout",
      "[    99.0] 4 -> 1 requestVotes timeout",
      "[   100.0] 0 -> 3 requestVotes",
      "[   100.0] 1 -> 3 requestVotes",
      "[   100.0] 2 -> 3 requestVotes",
      "[   100.0] 3 -> 2 requestVotes",
      "[   100.0] 4 -> 2 requestVotes",
    ]
  `)
})
