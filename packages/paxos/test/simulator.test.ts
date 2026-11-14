import { Network, Simulator } from '@leader-eval/framework'
import { expect, it } from 'vitest'
import { paxos } from '../src'

it('should complete in mesh', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode(undefined)
  network.fullyConnect(() => 1)

  const simulator = new Simulator({
    algorithm: paxos,
    network,
    params: { replyTimeout: 100, checkInterval: 10, checkTimeout: 30 },
    maxSteps: 100,
  })

  await simulator.run()

  expect(simulator.getLogs()).toMatchSnapshot()

  const settled = simulator.getLogs().find(line => line.includes('leader settled'))
  expect(settled).toMatch(/leader settled: \d+$/)
})

it('should not conclude if it forever timeouts', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode(undefined)
  network.fullyConnect(() => 100)

  const simulator = new Simulator({
    algorithm: paxos,
    network,
    params: { replyTimeout: 1, checkInterval: 10, checkTimeout: 30 },
    maxSteps: 100,
  })

  await expect(simulator.run())
    .rejects
    .toThrow('simulation did not terminate')

  expect(simulator.getLogs()).toMatchSnapshot()
})
