/* eslint-disable no-empty-pattern */
import type { Algorithm } from '@leader-eval/framework'
import { fn, rpc } from '@leader-eval/framework'

// algorithm start
let globalProposalNumber = 0

class Proposer {
  value: number = -1
  proposal_number: number = -1
  acknowledgements: number = 0
  promises: PaxosPromise[] = []
}

class Acceptor {
  accepted_number: number = -1
  promised_number: number = -1
  accepted_value: number = -1
}

class Listener {
  decided_value: number = -1
}

class PaxosPromise {
  accepted_num: number
  accepted_value: number
  constructor(accepted_num: number, accepted_value: number) {
    this.accepted_num = accepted_num
    this.accepted_value = accepted_value
  }
}

const leanerDecide = rpc()(async function leanerDecide({ sender }, node_index: number) {
  if (this.learner.decided_value === -1) {
    this.learner.decided_value = node_index
    this.assertLeader(sender)
  }
})

const proposerAccepted = rpc()(async function proposerAccepted({ }, promise_number: number) {
  if (promise_number !== this.proposer.proposal_number)
    return

  this.proposer.acknowledgements++

  if (this.proposer.acknowledgements === Math.ceil((this.network.length + 1) / 2)) {
    this.assertLeader(this)
    this.callAll(this.network, leanerDecide, this.id)
  }
})

const proposerNack = rpc()(async function proposerNack({ }, promise_number: number) {
  if (promise_number !== this.proposer.proposal_number)
    return

  this.abortOutstanding()
  this.proposer.proposal_number = -1
})

const acceptorAccept = rpc()(async function acceptorAccept({ sender }, promise_number: number, node_index: number) {
  if (this.acceptor.promised_number <= promise_number) {
    this.acceptor.promised_number = promise_number
    this.acceptor.accepted_number = promise_number
    this.acceptor.accepted_value = node_index

    sender.call(proposerAccepted, promise_number)
  }
  else {
    sender.call(proposerNack, promise_number)
  }
})

const proposerPromise = rpc()(async function proposerPromise({ }, promise_number: number, promise: PaxosPromise) {
  if (promise_number !== this.proposer.proposal_number)
    return
  this.proposer.promises.push(promise)

  if (this.proposer.promises.length === Math.ceil((this.network.length + 1) / 2)) {
    let v: number = this.proposer.value
    const array: Array<number> = []
    const promiseMaxVal = array.reduce((prev, curr) => {
      if (prev < curr)
        return curr
      return prev
    }, -1)
    if (promiseMaxVal !== -1) { // at least of the promises has value
      v = promiseMaxVal // pick value with the maximum number received from acceptors
    }
    this.callAll(this.network, acceptorAccept, this.proposer.proposal_number, v)
  }
})

const acceptorPrepare = rpc()(async function acceptorPrepare({ sender }, promise_number: number) {
  if (this.acceptor.promised_number < promise_number) {
    this.acceptor.promised_number = promise_number
    sender.call(proposerPromise, promise_number, new PaxosPromise(this.acceptor.accepted_number, this.acceptor.accepted_value))
  }
  else {
    sender.call(proposerNack, promise_number)
  }
})

// Runs when any node times out
const onTimeout = fn(async function onTimeout() {
  if (this.learner.decided_value !== -1)
    return // Stop once we've learned a leader.

  this.setTimeout(onTimeout, this.params.checkTimeout)

  this.proposer.proposal_number = globalProposalNumber++
  this.proposer.value = this.id
  this.proposer.acknowledgements = 0
  this.proposer.promises = []

  this.callAll(this.network, acceptorPrepare, this.proposer.proposal_number)
})

// Also runs on start, use to init state
const onStart = fn(async function onStart() {
  this.proposer = new Proposer()
  this.acceptor = new Acceptor()
  this.learner = new Listener()
  // the node will now wait to timeout.
  this.setTimeout(onTimeout, 0)
})

// algorithm end

export const paxos: Algorithm = {
  rpcs: [],
  events: { onStart },
}
