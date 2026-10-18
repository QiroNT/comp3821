import { Network, Simulator } from 'framework'
import { expect, it } from 'vitest'
import { bully } from '../src'

it('should complete in mesh', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode()
  network.fullyConnect(() => 1)

  const simulator = new Simulator(bully, network, 100)
  await simulator.run()

  expect(simulator.log()).toMatchInlineSnapshot(`
    [
      "[     0.0] 0 -> 1 areYouThere ok",
      "[     0.0] 0 -> 2 areYouThere ok",
      "[     0.0] 0 -> 3 areYouThere ok",
      "[     0.0] 0 -> 4 areYouThere ok",
      "[     0.0] 1 -> 2 areYouThere ok",
      "[     0.0] 1 -> 3 areYouThere ok",
      "[     0.0] 1 -> 4 areYouThere ok",
      "[     0.0] 2 -> 3 areYouThere ok",
      "[     0.0] 2 -> 4 areYouThere ok",
      "[     0.0] 3 -> 4 areYouThere ok",
      "[     0.0] 4 -> 0 halt ok",
      "[     0.0] 4 -> 1 halt ok",
      "[     0.0] 4 -> 2 halt ok",
      "[     0.0] 4 -> 3 halt ok",
      "[     1.0] 1 -> 0 areYouThere reply aborted",
      "[     1.0] 2 -> 0 areYouThere reply aborted",
      "[     1.0] 3 -> 0 areYouThere reply aborted",
      "[     1.0] 4 -> 0 areYouThere reply ok",
      "[     1.0] 2 -> 1 areYouThere reply aborted",
      "[     1.0] 3 -> 1 areYouThere reply aborted",
      "[     1.0] 4 -> 1 areYouThere reply ok",
      "[     1.0] 3 -> 2 areYouThere reply aborted",
      "[     1.0] 4 -> 2 areYouThere reply ok",
      "[     1.0] 4 -> 3 areYouThere reply ok",
      "[     1.0] 0 -> 4 halt reply ok",
      "[     1.0] 1 -> 4 halt reply ok",
      "[     1.0] 2 -> 4 halt reply ok",
      "[     1.0] 3 -> 4 halt reply ok",
      "[     2.0] 4 -> 0 newCoordinator ok",
      "[     2.0] 4 -> 1 newCoordinator ok",
      "[     2.0] 4 -> 2 newCoordinator ok",
      "[     2.0] 4 -> 3 newCoordinator ok",
      "[     3.0] 0 -> 4 newCoordinator reply ok",
      "[     3.0] 1 -> 4 newCoordinator reply ok",
      "[     3.0] 2 -> 4 newCoordinator reply ok",
      "[     3.0] 3 -> 4 newCoordinator reply ok",
      "[     4.0] 4 -> 0 ready ok",
      "[     4.0] 4 -> 1 ready ok",
      "[     4.0] 4 -> 2 ready ok",
      "[     4.0] 4 -> 3 ready ok",
      "[     5.0] 0 assertLeader(4)",
      "[     5.0] 0 -> 4 ready reply ok",
      "[     5.0] 1 assertLeader(4)",
      "[     5.0] 1 -> 4 ready reply ok",
      "[     5.0] 2 assertLeader(4)",
      "[     5.0] 2 -> 4 ready reply ok",
      "[     5.0] 3 assertLeader(4)",
      "[     5.0] 3 -> 4 ready reply ok",
      "[     6.0] 4 assertLeader(4)",
      "[     6.0] leader settled: 4",
    ]
  `)
})

it('should not conclude if it forever timeouts', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode()
  network.fullyConnect(() => 100)

  const simulator = new Simulator(bully, network, 1)
  await simulator.run()

  expect(simulator.log()).toMatchInlineSnapshot(`
    [
      "[     0.0] 0 -> 1 areYouThere timeout",
      "[     0.0] 0 -> 2 areYouThere timeout",
      "[     0.0] 0 -> 3 areYouThere timeout",
      "[     0.0] 0 -> 4 areYouThere timeout",
      "[     0.0] 1 -> 2 areYouThere timeout",
      "[     0.0] 1 -> 3 areYouThere timeout",
      "[     0.0] 1 -> 4 areYouThere timeout",
      "[     0.0] 2 -> 3 areYouThere timeout",
      "[     0.0] 2 -> 4 areYouThere timeout",
      "[     0.0] 3 -> 4 areYouThere timeout",
      "[     0.0] 4 -> 0 halt timeout",
      "[     0.0] 4 -> 1 halt timeout",
      "[     0.0] 4 -> 2 halt timeout",
      "[     0.0] 4 -> 3 halt timeout",
      "[     1.0] 0 assertLeader(0)",
      "[     1.0] 1 -> 0 halt timeout",
      "[     1.0] 2 -> 0 halt timeout",
      "[     1.0] 2 -> 1 halt timeout",
      "[     1.0] 3 -> 0 halt timeout",
      "[     1.0] 3 -> 1 halt timeout",
      "[     1.0] 3 -> 2 halt timeout",
      "[     1.0] 4 assertLeader(4)",
      "[     2.0] 1 assertLeader(1)",
      "[     2.0] 2 assertLeader(2)",
      "[     2.0] 3 assertLeader(3)",
      "[   100.0] 1 -> 0 areYouThere reply aborted",
      "[   100.0] 2 -> 0 areYouThere reply aborted",
      "[   100.0] 3 -> 0 areYouThere reply aborted",
      "[   100.0] 4 -> 0 areYouThere reply timeout",
      "[   100.0] 2 -> 1 areYouThere reply aborted",
      "[   100.0] 3 -> 1 areYouThere reply aborted",
      "[   100.0] 4 -> 1 areYouThere reply timeout",
      "[   100.0] 3 -> 2 areYouThere reply aborted",
      "[   100.0] 4 -> 2 areYouThere reply timeout",
      "[   100.0] 4 -> 3 areYouThere reply timeout",
      "[   100.0] 0 -> 4 halt reply aborted",
      "[   100.0] 1 -> 4 halt reply aborted",
      "[   100.0] 2 -> 4 halt reply aborted",
      "[   100.0] 3 -> 4 halt reply timeout",
      "[   101.0] 0 -> 1 halt reply aborted",
      "[   101.0] 0 -> 2 halt reply aborted",
      "[   101.0] 1 -> 2 halt reply aborted",
      "[   101.0] 0 -> 3 halt reply timeout",
      "[   101.0] 1 -> 3 halt reply timeout",
      "[   101.0] 2 -> 3 halt reply timeout",
    ]
  `)
})
