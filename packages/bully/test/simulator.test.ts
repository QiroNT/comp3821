import { Network, Simulator } from '@leader-eval/framework'
import { expect, it } from 'vitest'
import { bully } from '../src'

it('should complete in mesh', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode()
  network.fullyConnect(() => 1)

  const simulator = new Simulator({
    algorithm: bully,
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
      "[     0.0] 0 -> 1 areYouThere() ok",
      "[     0.0] 0 -> 2 areYouThere() ok",
      "[     0.0] 0 -> 3 areYouThere() ok",
      "[     0.0] 0 -> 4 areYouThere() ok",
      "[     0.0] 1 -> 2 areYouThere() ok",
      "[     0.0] 1 -> 3 areYouThere() ok",
      "[     0.0] 1 -> 4 areYouThere() ok",
      "[     0.0] 2 -> 3 areYouThere() ok",
      "[     0.0] 2 -> 4 areYouThere() ok",
      "[     0.0] 3 -> 4 areYouThere() ok",
      "[     0.0] 4 -> 0 halt() ok",
      "[     0.0] 4 -> 1 halt() ok",
      "[     0.0] 4 -> 2 halt() ok",
      "[     0.0] 4 -> 3 halt() ok",
      "[     1.0] 1 -> 0 areYouThere reply(undefined) aborted",
      "[     1.0] 2 -> 0 areYouThere reply(undefined) aborted",
      "[     1.0] 3 -> 0 areYouThere reply(undefined) aborted",
      "[     1.0] 4 -> 0 areYouThere reply(undefined) ok",
      "[     1.0] 2 -> 1 areYouThere reply(undefined) aborted",
      "[     1.0] 3 -> 1 areYouThere reply(undefined) aborted",
      "[     1.0] 4 -> 1 areYouThere reply(undefined) ok",
      "[     1.0] 3 -> 2 areYouThere reply(undefined) aborted",
      "[     1.0] 4 -> 2 areYouThere reply(undefined) ok",
      "[     1.0] 4 -> 3 areYouThere reply(undefined) ok",
      "[     1.0] 0 -> 4 halt reply(undefined) ok",
      "[     1.0] 1 -> 4 halt reply(undefined) ok",
      "[     1.0] 2 -> 4 halt reply(undefined) ok",
      "[     1.0] 3 -> 4 halt reply(undefined) ok",
      "[     2.0] 4 -> 0 newCoordinator() ok",
      "[     2.0] 4 -> 1 newCoordinator() ok",
      "[     2.0] 4 -> 2 newCoordinator() ok",
      "[     2.0] 4 -> 3 newCoordinator() ok",
      "[     3.0] 0 -> 4 newCoordinator reply(undefined) ok",
      "[     3.0] 1 -> 4 newCoordinator reply(undefined) ok",
      "[     3.0] 2 -> 4 newCoordinator reply(undefined) ok",
      "[     3.0] 3 -> 4 newCoordinator reply(undefined) ok",
      "[     4.0] 4 -> 0 ready() ok",
      "[     4.0] 4 -> 1 ready() ok",
      "[     4.0] 4 -> 2 ready() ok",
      "[     4.0] 4 -> 3 ready() ok",
      "[     5.0] 0 assertLeader(4)",
      "[     5.0] 0 -> 4 ready reply(undefined) ok",
      "[     5.0] 1 assertLeader(4)",
      "[     5.0] 1 -> 4 ready reply(undefined) ok",
      "[     5.0] 2 assertLeader(4)",
      "[     5.0] 2 -> 4 ready reply(undefined) ok",
      "[     5.0] 3 assertLeader(4)",
      "[     5.0] 3 -> 4 ready reply(undefined) ok",
      "[     6.0] 4 assertLeader(4)",
      "[     6.0] leader settled: 4",
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
    algorithm: bully,
    network,
    params: {
      replyTimeout: 1,
      checkInterval: 10,
      checkTimeout: 30,
    },
    maxSteps: 60,
  })

  await expect(simulator.run())
    .rejects
    .toThrow('simulation did not terminate')

  expect(simulator.log()).toMatchInlineSnapshot(`
    [
      "[     0.0] 0 -> 1 areYouThere() timeout",
      "[     0.0] 0 -> 2 areYouThere() timeout",
      "[     0.0] 0 -> 3 areYouThere() timeout",
      "[     0.0] 0 -> 4 areYouThere() timeout",
      "[     0.0] 1 -> 2 areYouThere() timeout",
      "[     0.0] 1 -> 3 areYouThere() timeout",
      "[     0.0] 1 -> 4 areYouThere() timeout",
      "[     0.0] 2 -> 3 areYouThere() timeout",
      "[     0.0] 2 -> 4 areYouThere() timeout",
      "[     0.0] 3 -> 4 areYouThere() timeout",
      "[     0.0] 4 -> 0 halt() timeout",
      "[     0.0] 4 -> 1 halt() timeout",
      "[     0.0] 4 -> 2 halt() timeout",
      "[     0.0] 4 -> 3 halt() timeout",
      "[     1.0] 0 assertLeader(0)",
      "[     1.0] 1 -> 0 halt() timeout",
      "[     1.0] 2 -> 0 halt() timeout",
      "[     1.0] 2 -> 1 halt() timeout",
      "[     1.0] 3 -> 0 halt() timeout",
      "[     1.0] 3 -> 1 halt() timeout",
      "[     1.0] 3 -> 2 halt() timeout",
      "[     1.0] 4 assertLeader(4)",
      "[     2.0] 1 assertLeader(1)",
      "[     2.0] 2 assertLeader(2)",
      "[     2.0] 3 assertLeader(3)",
      "[    10.0] 0 onCheck",
      "[    10.0] 0 -> 1 areYouNormal() timeout",
      "[    10.0] 1 onCheck",
      "[    10.0] 1 -> 0 areYouNormal() timeout",
      "[    10.0] 2 onCheck",
      "[    10.0] 2 -> 0 areYouNormal() timeout",
      "[    10.0] 3 onCheck",
      "[    10.0] 3 -> 0 areYouNormal() timeout",
      "[    10.0] 4 onCheck",
      "[    10.0] 4 -> 0 areYouNormal() timeout",
      "[    11.0] 0 -> 2 areYouNormal() timeout",
      "[    11.0] 1 -> 2 areYouNormal() timeout",
      "[    11.0] 2 -> 1 areYouNormal() timeout",
      "[    11.0] 3 -> 1 areYouNormal() timeout",
      "[    11.0] 4 -> 1 areYouNormal() timeout",
      "[    12.0] 0 -> 3 areYouNormal() timeout",
      "[    12.0] 1 -> 3 areYouNormal() timeout",
      "[    12.0] 2 -> 3 areYouNormal() timeout",
      "[    12.0] 3 -> 2 areYouNormal() timeout",
      "[    12.0] 4 -> 2 areYouNormal() timeout",
      "[    13.0] 0 -> 4 areYouNormal() timeout",
      "[    13.0] 1 -> 4 areYouNormal() timeout",
      "[    13.0] 2 -> 4 areYouNormal() timeout",
      "[    13.0] 3 -> 4 areYouNormal() timeout",
      "[    13.0] 4 -> 3 areYouNormal() timeout",
      "[    20.0] 0 onCheck",
      "[    20.0] 0 -> 1 areYouNormal() timeout",
      "[    20.0] 1 onCheck",
      "[    20.0] 1 -> 0 areYouNormal() timeout",
      "[    20.0] 2 onCheck",
      "[    20.0] 2 -> 0 areYouNormal() timeout",
      "[    20.0] 3 onCheck",
      "[    20.0] 3 -> 0 areYouNormal() timeout",
      "[    20.0] 4 onCheck",
      "[    20.0] 4 -> 0 areYouNormal() timeout",
      "[    21.0] 0 -> 2 areYouNormal() timeout",
      "[    21.0] 1 -> 2 areYouNormal() timeout",
      "[    21.0] 2 -> 1 areYouNormal() timeout",
      "[    21.0] 3 -> 1 areYouNormal() timeout",
      "[    21.0] 4 -> 1 areYouNormal() timeout",
      "[    22.0] 0 -> 3 areYouNormal()",
      "[    22.0] 1 -> 3 areYouNormal()",
      "[    22.0] 2 -> 3 areYouNormal()",
      "[    22.0] 3 -> 2 areYouNormal()",
      "[    22.0] 4 -> 2 areYouNormal()",
    ]
  `)
})
