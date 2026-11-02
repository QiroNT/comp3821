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
    replyTimeout: 100,
    checkInterval: () => 10,
    checkTimeout: () => 30,
    maxSteps: 100,
  })

  await simulator.run()

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
    replyTimeout: 1,
    checkInterval: () => 10,
    checkTimeout: () => 30,
    maxSteps: 100,
  })

  await expect(simulator.run())
    .rejects
    .toThrow('simulation did not terminate')
})
