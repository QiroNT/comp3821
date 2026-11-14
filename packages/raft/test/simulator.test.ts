import { Network, Simulator } from '@leader-eval/framework'
import { expect, it } from 'vitest'
import { raft } from '../src'

it('should complete in mesh', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode(undefined)
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

  expect(simulator.getLogs()).toMatchInlineSnapshot(`
    [
      "[    49.0] 1 onTimeout",
      "[    49.0] 1 -> 0 requestVotes(1) ok",
      "[    50.0] 0 -> 1 requestVotes reply(true) ok",
      "[    51.0] 1 -> 2 requestVotes(1) ok",
      "[    52.0] 2 -> 1 requestVotes reply(true) ok",
      "[    53.0] 1 -> 3 requestVotes(1) ok",
      "[    54.0] 3 -> 1 requestVotes reply(true) ok",
      "[    55.0] 0 onTimeout",
      "[    55.0] 0 -> 1 requestVotes(2) ok",
      "[    55.0] 1 -> 4 requestVotes(1) ok",
      "[    56.0] 1 -> 0 requestVotes reply(true) ok",
      "[    56.0] 4 -> 1 requestVotes reply(true) ok",
      "[    57.0] 0 -> 2 requestVotes(2)",
      "[    57.0] 1 -> 0 appendEntry(2)",
      "[    57.0] 1 -> 2 appendEntry(2)",
      "[    57.0] 1 -> 3 appendEntry(2)",
      "[    57.0] 1 -> 4 appendEntry(2)",
      "[    57.0] 1 assertLeader(1)",
      "[    58.0] 2 -> 0 requestVotes reply(true)",
      "[    58.0] 0 assertLeader(1)",
      "[    58.0] 0 -> 1 appendEntry reply(true)",
      "[    58.0] 2 assertLeader(1)",
      "[    58.0] 2 -> 1 appendEntry reply(true)",
      "[    58.0] 3 assertLeader(1)",
      "[    58.0] 3 -> 1 appendEntry reply(true)",
      "[    58.0] 4 assertLeader(1)",
      "[    58.0] leader settled: 1",
      "[    58.0] 4 -> 1 appendEntry reply(true)",
    ]
  `)

  const settled = simulator.getLogs().find(line => line.includes('leader settled'))
  expect(settled).toMatch(/leader settled: \d+$/)
})

it('should not conclude if it forever timeouts', async () => {
  const network = new Network()
  for (let i = 0; i < 5; i++)
    network.addNode(undefined)
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

  expect(simulator.getLogs()).toMatchInlineSnapshot(`
    [
      "[    49.0] 1 onTimeout",
      "[    49.0] 1 -> 0 requestVotes(1) timeout",
      "[    50.0] 1 -> 2 requestVotes(1) timeout",
      "[    51.0] 1 -> 3 requestVotes(1) timeout",
      "[    52.0] 1 -> 4 requestVotes(1) timeout",
      "[    55.0] 0 onTimeout",
      "[    55.0] 0 -> 1 requestVotes(1) timeout",
      "[    56.0] 0 -> 2 requestVotes(1) timeout",
      "[    57.0] 0 -> 3 requestVotes(1) timeout",
      "[    58.0] 0 -> 4 requestVotes(1) timeout",
      "[    60.0] 3 onTimeout",
      "[    60.0] 3 -> 0 requestVotes(1) timeout",
      "[    61.0] 3 -> 1 requestVotes(1) timeout",
      "[    62.0] 3 -> 2 requestVotes(1) timeout",
      "[    63.0] 3 -> 4 requestVotes(1) timeout",
      "[    64.0] 2 onTimeout",
      "[    64.0] 2 -> 0 requestVotes(1) timeout",
      "[    65.0] 4 onTimeout",
      "[    65.0] 4 -> 0 requestVotes(1) timeout",
      "[    65.0] 2 -> 1 requestVotes(1) timeout",
      "[    66.0] 4 -> 1 requestVotes(1) timeout",
      "[    66.0] 2 -> 3 requestVotes(1) timeout",
      "[    67.0] 4 -> 2 requestVotes(1) timeout",
      "[    67.0] 2 -> 4 requestVotes(1) timeout",
      "[    68.0] 4 -> 3 requestVotes(1) timeout",
      "[    99.0] 1 onTimeout",
      "[    99.0] 1 -> 0 requestVotes(2) timeout",
      "[   100.0] 1 -> 2 requestVotes(2) timeout",
      "[   101.0] 1 -> 3 requestVotes(2) timeout",
      "[   102.0] 1 -> 4 requestVotes(2) timeout",
      "[   114.0] 0 onTimeout",
      "[   114.0] 0 -> 1 requestVotes(2) timeout",
      "[   115.0] 0 -> 2 requestVotes(2) timeout",
      "[   116.0] 0 -> 3 requestVotes(2) timeout",
      "[   117.0] 0 -> 4 requestVotes(2) timeout",
      "[   123.0] 3 onTimeout",
      "[   123.0] 3 -> 0 requestVotes(2) timeout",
      "[   124.0] 3 -> 1 requestVotes(2) timeout",
      "[   125.0] 2 onTimeout",
      "[   125.0] 2 -> 0 requestVotes(2) timeout",
      "[   125.0] 3 -> 2 requestVotes(2) timeout",
      "[   126.0] 2 -> 1 requestVotes(2) timeout",
      "[   126.0] 3 -> 4 requestVotes(2) timeout",
      "[   127.0] 2 -> 3 requestVotes(2) timeout",
      "[   128.0] 4 onTimeout",
      "[   128.0] 4 -> 0 requestVotes(2) timeout",
      "[   128.0] 2 -> 4 requestVotes(2) timeout",
      "[   129.0] 4 -> 1 requestVotes(2) timeout",
      "[   130.0] 4 -> 2 requestVotes(2) timeout",
      "[   131.0] 4 -> 3 requestVotes(2) timeout",
      "[   143.0] 1 onTimeout",
      "[   143.0] 1 -> 0 requestVotes(3) timeout",
      "[   144.0] 1 -> 2 requestVotes(3) timeout",
      "[   145.0] 1 -> 3 requestVotes(3) timeout",
      "[   146.0] 1 -> 4 requestVotes(3) timeout",
      "[   149.0] 0 -> 1 requestVotes reply(false) timeout",
      "[   150.0] 2 -> 1 requestVotes reply(false) timeout",
      "[   151.0] 3 -> 1 requestVotes reply(false) timeout",
      "[   152.0] 4 -> 1 requestVotes reply(false) timeout",
      "[   155.0] 1 -> 0 requestVotes reply(false) timeout",
      "[   156.0] 2 -> 0 requestVotes reply(false) timeout",
      "[   157.0] 3 -> 0 requestVotes reply(false) timeout",
      "[   158.0] 4 -> 0 requestVotes reply(false) timeout",
      "[   160.0] 0 -> 3 requestVotes reply(false) timeout",
      "[   161.0] 1 -> 3 requestVotes reply(false) timeout",
      "[   162.0] 2 -> 3 requestVotes reply(false) timeout",
      "[   163.0] 4 -> 3 requestVotes reply(false) timeout",
      "[   164.0] 0 -> 2 requestVotes reply(false) timeout",
      "[   165.0] 0 -> 4 requestVotes reply(false) timeout",
      "[   165.0] 1 -> 2 requestVotes reply(false) timeout",
      "[   166.0] 1 -> 4 requestVotes reply(false) timeout",
      "[   166.0] 3 -> 2 requestVotes reply(false) timeout",
      "[   167.0] 2 -> 4 requestVotes reply(false)",
      "[   167.0] 4 -> 2 requestVotes reply(false)",
    ]
  `)
})
