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

  expect(simulator.getLogs()).toMatchInlineSnapshot(`
    [
      "[    30.0] 0 onTimeout",
      "[    30.0] 0 -> 1 acceptorPrepare(0)",
      "[    30.0] 0 -> 2 acceptorPrepare(0)",
      "[    30.0] 0 -> 3 acceptorPrepare(0)",
      "[    30.0] 0 -> 4 acceptorPrepare(0)",
      "[    30.0] 1 onTimeout",
      "[    30.0] 1 -> 0 acceptorPrepare(1)",
      "[    30.0] 1 -> 2 acceptorPrepare(1)",
      "[    30.0] 1 -> 3 acceptorPrepare(1)",
      "[    30.0] 1 -> 4 acceptorPrepare(1)",
      "[    30.0] 2 onTimeout",
      "[    30.0] 2 -> 0 acceptorPrepare(2)",
      "[    30.0] 2 -> 1 acceptorPrepare(2)",
      "[    30.0] 2 -> 3 acceptorPrepare(2)",
      "[    30.0] 2 -> 4 acceptorPrepare(2)",
      "[    30.0] 3 onTimeout",
      "[    30.0] 3 -> 0 acceptorPrepare(3)",
      "[    30.0] 3 -> 1 acceptorPrepare(3)",
      "[    30.0] 3 -> 2 acceptorPrepare(3)",
      "[    30.0] 3 -> 4 acceptorPrepare(3)",
      "[    30.0] 4 onTimeout",
      "[    30.0] 4 -> 0 acceptorPrepare(4)",
      "[    30.0] 4 -> 1 acceptorPrepare(4)",
      "[    30.0] 4 -> 2 acceptorPrepare(4)",
      "[    30.0] 4 -> 3 acceptorPrepare(4)",
      "[    31.0] 1 -> 0 proposerPromise(0, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 2 -> 0 proposerPromise(0, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 3 -> 0 proposerPromise(0, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 4 -> 0 proposerPromise(0, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 0 -> 1 proposerPromise(1, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 2 -> 1 proposerPromise(1, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 3 -> 1 proposerPromise(1, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 4 -> 1 proposerPromise(1, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 0 -> 2 proposerPromise(2, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 1 -> 2 proposerPromise(2, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 3 -> 2 proposerPromise(2, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 4 -> 2 proposerPromise(2, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 0 -> 3 proposerPromise(3, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 1 -> 3 proposerPromise(3, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 2 -> 3 proposerPromise(3, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 4 -> 3 proposerPromise(3, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 0 -> 4 proposerPromise(4, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 1 -> 4 proposerPromise(4, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 2 -> 4 proposerPromise(4, {"accepted_num":-1,"accepted_value":-1})",
      "[    31.0] 3 -> 4 proposerPromise(4, {"accepted_num":-1,"accepted_value":-1})",
      "[    32.0] 0 -> 1 acceptorAccept(0, 0)",
      "[    32.0] 0 -> 2 acceptorAccept(0, 0)",
      "[    32.0] 0 -> 3 acceptorAccept(0, 0)",
      "[    32.0] 0 -> 4 acceptorAccept(0, 0)",
      "[    32.0] 1 -> 0 acceptorAccept(1, 1)",
      "[    32.0] 1 -> 2 acceptorAccept(1, 1)",
      "[    32.0] 1 -> 3 acceptorAccept(1, 1)",
      "[    32.0] 1 -> 4 acceptorAccept(1, 1)",
      "[    32.0] 2 -> 0 acceptorAccept(2, 2)",
      "[    32.0] 2 -> 1 acceptorAccept(2, 2)",
      "[    32.0] 2 -> 3 acceptorAccept(2, 2)",
      "[    32.0] 2 -> 4 acceptorAccept(2, 2)",
      "[    32.0] 3 -> 0 acceptorAccept(3, 3)",
      "[    32.0] 3 -> 1 acceptorAccept(3, 3)",
      "[    32.0] 3 -> 2 acceptorAccept(3, 3)",
      "[    32.0] 3 -> 4 acceptorAccept(3, 3)",
      "[    32.0] 4 -> 0 acceptorAccept(4, 4)",
      "[    32.0] 4 -> 1 acceptorAccept(4, 4)",
      "[    32.0] 4 -> 2 acceptorAccept(4, 4)",
      "[    32.0] 4 -> 3 acceptorAccept(4, 4)",
      "[    33.0] 1 -> 0 proposerNack(0)",
      "[    33.0] 2 -> 0 proposerNack(0)",
      "[    33.0] 3 -> 0 proposerNack(0)",
      "[    33.0] 4 -> 0 proposerNack(0)",
      "[    33.0] 0 -> 1 proposerNack(1) aborted",
      "[    33.0] 2 -> 1 proposerNack(1)",
      "[    33.0] 3 -> 1 proposerNack(1)",
      "[    33.0] 4 -> 1 proposerNack(1)",
      "[    33.0] 0 -> 2 proposerNack(2) aborted",
      "[    33.0] 1 -> 2 proposerNack(2) aborted",
      "[    33.0] 3 -> 2 proposerNack(2)",
      "[    33.0] 4 -> 2 proposerNack(2)",
      "[    33.0] 0 -> 3 proposerNack(3) aborted",
      "[    33.0] 1 -> 3 proposerNack(3) aborted",
      "[    33.0] 2 -> 3 proposerNack(3) aborted",
      "[    33.0] 4 -> 3 proposerAccepted(3)",
      "[    33.0] 0 -> 4 proposerAccepted(4) aborted",
      "[    33.0] 1 -> 4 proposerAccepted(4) aborted",
      "[    33.0] 2 -> 4 proposerAccepted(4) aborted",
      "[    33.0] 3 -> 4 proposerAccepted(4) aborted",
      "[    34.0] 4 assertLeader(4)",
      "[    34.0] 4 -> 0 leanerDecide(4)",
      "[    34.0] 4 -> 1 leanerDecide(4)",
      "[    34.0] 4 -> 2 leanerDecide(4)",
      "[    34.0] 4 -> 3 leanerDecide(4)",
      "[    35.0] 0 assertLeader(4)",
      "[    35.0] 1 assertLeader(4)",
      "[    35.0] 2 assertLeader(4)",
      "[    35.0] 3 assertLeader(4)",
      "[    35.0] leader settled: 4",
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
    algorithm: paxos,
    network,
    params: { replyTimeout: 1, checkInterval: 10, checkTimeout: 30 },
    maxSteps: 20,
  })

  await expect(simulator.run())
    .rejects
    .toThrow('simulation did not terminate')

  expect(simulator.getLogs()).toMatchInlineSnapshot(`
    [
      "[    30.0] 0 onTimeout",
      "[    30.0] 0 -> 1 acceptorPrepare(5) timeout",
      "[    30.0] 0 -> 2 acceptorPrepare(5) timeout",
      "[    30.0] 0 -> 3 acceptorPrepare(5) timeout",
      "[    30.0] 0 -> 4 acceptorPrepare(5) timeout",
      "[    30.0] 1 onTimeout",
      "[    30.0] 1 -> 0 acceptorPrepare(6) timeout",
      "[    30.0] 1 -> 2 acceptorPrepare(6) timeout",
      "[    30.0] 1 -> 3 acceptorPrepare(6) timeout",
      "[    30.0] 1 -> 4 acceptorPrepare(6) timeout",
      "[    30.0] 2 onTimeout",
      "[    30.0] 2 -> 0 acceptorPrepare(7) timeout",
      "[    30.0] 2 -> 1 acceptorPrepare(7) timeout",
      "[    30.0] 2 -> 3 acceptorPrepare(7) timeout",
      "[    30.0] 2 -> 4 acceptorPrepare(7) timeout",
      "[    30.0] 3 onTimeout",
      "[    30.0] 3 -> 0 acceptorPrepare(8) timeout",
      "[    30.0] 3 -> 1 acceptorPrepare(8) timeout",
      "[    30.0] 3 -> 2 acceptorPrepare(8) timeout",
      "[    30.0] 3 -> 4 acceptorPrepare(8)",
      "[    30.0] 4 onTimeout",
      "[    30.0] 4 -> 0 acceptorPrepare(9)",
      "[    30.0] 4 -> 1 acceptorPrepare(9)",
      "[    30.0] 4 -> 2 acceptorPrepare(9)",
      "[    30.0] 4 -> 3 acceptorPrepare(9)",
    ]
  `)
})
