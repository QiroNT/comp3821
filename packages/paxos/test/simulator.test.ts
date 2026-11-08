import { Network, Simulator } from 'framework'
import { expect, it } from 'vitest'
import { paxos } from '../src'

it('should complete in mesh', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode()
  network.fullyConnect(() => 1)

  const simulator = new Simulator({
    algorithm: paxos,
    network,
    params: { replyTimeout: 100, checkInterval: 10, checkTimeout: 30 },
    maxSteps: 100,
  })

  await simulator.run()

  expect(simulator.log()).toMatchInlineSnapshot(`
    [
      "[    30.0] 0 onTimeout",
      "[    30.0] 0 -> 1 acceptorPrepare",
      "[    30.0] 0 -> 2 acceptorPrepare",
      "[    30.0] 0 -> 3 acceptorPrepare",
      "[    30.0] 0 -> 4 acceptorPrepare",
      "[    30.0] 1 onTimeout",
      "[    30.0] 1 -> 0 acceptorPrepare",
      "[    30.0] 1 -> 2 acceptorPrepare",
      "[    30.0] 1 -> 3 acceptorPrepare",
      "[    30.0] 1 -> 4 acceptorPrepare",
      "[    30.0] 2 onTimeout",
      "[    30.0] 2 -> 0 acceptorPrepare",
      "[    30.0] 2 -> 1 acceptorPrepare",
      "[    30.0] 2 -> 3 acceptorPrepare",
      "[    30.0] 2 -> 4 acceptorPrepare",
      "[    30.0] 3 onTimeout",
      "[    30.0] 3 -> 0 acceptorPrepare",
      "[    30.0] 3 -> 1 acceptorPrepare",
      "[    30.0] 3 -> 2 acceptorPrepare",
      "[    30.0] 3 -> 4 acceptorPrepare",
      "[    30.0] 4 onTimeout",
      "[    30.0] 4 -> 0 acceptorPrepare",
      "[    30.0] 4 -> 1 acceptorPrepare",
      "[    30.0] 4 -> 2 acceptorPrepare",
      "[    30.0] 4 -> 3 acceptorPrepare",
      "[    31.0] 1 -> 0 proposerPromise",
      "[    31.0] 2 -> 0 proposerPromise",
      "[    31.0] 3 -> 0 proposerPromise",
      "[    31.0] 4 -> 0 proposerPromise",
      "[    31.0] 0 -> 1 proposerPromise",
      "[    31.0] 2 -> 1 proposerPromise",
      "[    31.0] 3 -> 1 proposerPromise",
      "[    31.0] 4 -> 1 proposerPromise",
      "[    31.0] 0 -> 2 proposerPromise",
      "[    31.0] 1 -> 2 proposerPromise",
      "[    31.0] 3 -> 2 proposerPromise",
      "[    31.0] 4 -> 2 proposerPromise",
      "[    31.0] 0 -> 3 proposerPromise",
      "[    31.0] 1 -> 3 proposerPromise",
      "[    31.0] 2 -> 3 proposerPromise",
      "[    31.0] 4 -> 3 proposerPromise",
      "[    31.0] 0 -> 4 proposerPromise",
      "[    31.0] 1 -> 4 proposerPromise",
      "[    31.0] 2 -> 4 proposerPromise",
      "[    31.0] 3 -> 4 proposerPromise",
      "[    32.0] 0 -> 1 acceptorAccept",
      "[    32.0] 0 -> 2 acceptorAccept",
      "[    32.0] 0 -> 3 acceptorAccept",
      "[    32.0] 0 -> 4 acceptorAccept",
      "[    32.0] 1 -> 0 acceptorAccept",
      "[    32.0] 1 -> 2 acceptorAccept",
      "[    32.0] 1 -> 3 acceptorAccept",
      "[    32.0] 1 -> 4 acceptorAccept",
      "[    32.0] 2 -> 0 acceptorAccept",
      "[    32.0] 2 -> 1 acceptorAccept",
      "[    32.0] 2 -> 3 acceptorAccept",
      "[    32.0] 2 -> 4 acceptorAccept",
      "[    32.0] 3 -> 0 acceptorAccept",
      "[    32.0] 3 -> 1 acceptorAccept",
      "[    32.0] 3 -> 2 acceptorAccept",
      "[    32.0] 3 -> 4 acceptorAccept",
      "[    32.0] 4 -> 0 acceptorAccept",
      "[    32.0] 4 -> 1 acceptorAccept",
      "[    32.0] 4 -> 2 acceptorAccept",
      "[    32.0] 4 -> 3 acceptorAccept",
      "[    33.0] 1 -> 0 proposerNack",
      "[    33.0] 2 -> 0 proposerNack",
      "[    33.0] 3 -> 0 proposerNack",
      "[    33.0] 4 -> 0 proposerNack",
      "[    33.0] 0 -> 1 proposerNack aborted",
      "[    33.0] 2 -> 1 proposerNack",
      "[    33.0] 3 -> 1 proposerNack",
      "[    33.0] 4 -> 1 proposerNack",
      "[    33.0] 0 -> 2 proposerNack aborted",
      "[    33.0] 1 -> 2 proposerNack aborted",
      "[    33.0] 3 -> 2 proposerNack",
      "[    33.0] 4 -> 2 proposerNack",
      "[    33.0] 0 -> 3 proposerNack aborted",
      "[    33.0] 1 -> 3 proposerNack aborted",
      "[    33.0] 2 -> 3 proposerNack aborted",
      "[    33.0] 4 -> 3 proposerAccepted",
      "[    33.0] 0 -> 4 proposerAccepted aborted",
      "[    33.0] 1 -> 4 proposerAccepted aborted",
      "[    33.0] 2 -> 4 proposerAccepted aborted",
      "[    33.0] 3 -> 4 proposerAccepted aborted",
      "[    34.0] 4 assertLeader(4)",
      "[    34.0] 4 -> 0 leanerDecide",
      "[    34.0] 4 -> 1 leanerDecide",
      "[    34.0] 4 -> 2 leanerDecide",
      "[    34.0] 4 -> 3 leanerDecide",
      "[    35.0] 0 assertLeader(4)",
      "[    35.0] 1 assertLeader(4)",
      "[    35.0] 2 assertLeader(4)",
      "[    35.0] 3 assertLeader(4)",
      "[    35.0] leader settled: 4",
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
    algorithm: paxos,
    network,
    params: { replyTimeout: 1, checkInterval: 10, checkTimeout: 30 },
    maxSteps: 20,
  })

  await expect(simulator.run())
    .rejects
    .toThrow('simulation did not terminate')

  expect(simulator.log()).toMatchInlineSnapshot(`
    [
      "[    30.0] 0 onTimeout",
      "[    30.0] 0 -> 1 acceptorPrepare timeout",
      "[    30.0] 0 -> 2 acceptorPrepare timeout",
      "[    30.0] 0 -> 3 acceptorPrepare timeout",
      "[    30.0] 0 -> 4 acceptorPrepare timeout",
      "[    30.0] 1 onTimeout",
      "[    30.0] 1 -> 0 acceptorPrepare timeout",
      "[    30.0] 1 -> 2 acceptorPrepare timeout",
      "[    30.0] 1 -> 3 acceptorPrepare timeout",
      "[    30.0] 1 -> 4 acceptorPrepare timeout",
      "[    30.0] 2 onTimeout",
      "[    30.0] 2 -> 0 acceptorPrepare timeout",
      "[    30.0] 2 -> 1 acceptorPrepare timeout",
      "[    30.0] 2 -> 3 acceptorPrepare timeout",
      "[    30.0] 2 -> 4 acceptorPrepare timeout",
      "[    30.0] 3 onTimeout",
      "[    30.0] 3 -> 0 acceptorPrepare timeout",
      "[    30.0] 3 -> 1 acceptorPrepare timeout",
      "[    30.0] 3 -> 2 acceptorPrepare timeout",
      "[    30.0] 3 -> 4 acceptorPrepare",
      "[    30.0] 4 onTimeout",
      "[    30.0] 4 -> 0 acceptorPrepare",
      "[    30.0] 4 -> 1 acceptorPrepare",
      "[    30.0] 4 -> 2 acceptorPrepare",
      "[    30.0] 4 -> 3 acceptorPrepare",
    ]
  `)
})
