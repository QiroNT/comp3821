import type { Algorithm } from 'framework'
import { fn, rpc } from 'framework'

/* eslint prefer-arrow-callback: "off" */

// The node's expected properties/attributes:
/*
raftNode = {
    state:  'follower' | 'candidate' | 'leader'
    followerTimeout: a time
    candidateTimeout: a time
    leaderTimeout: a time
    term: positive integer starting from 0
    voted: boolean
    votes: positive integer starting from 0
}
*/

// algorithm begin

// A candidate calls this to request a vote
const requestVote = rpc()(async function requestVotes() {

})

// the heartbeat function called by a coordinator
const appendEntry = rpc()(async function appendEntry() {
  // TODO: reset timeout
  // TODO: step down if term out of date
})

const election = fn(async function election() {
  // TODO: ELECTION!
})

const onCheck = fn(async function onCheck() {
  // only coordinator checks if all nodes are up.
  if (this.coordinator === this && this.state === 'leader') {
    for (const node of this.network) {
      const { status, response } = await node.call(appendEntry)
    }
  }
})

// When the system starts, or when the node recovers
const onRecovery = fn(async function onRecovery() {
  // initiate all the expected attributes
  // TODO ^^^
  this.state = 'follower'
  this.term = 0
  // the node will now wait to timeout.
})

// When the node hasn't heard from the leader recently
const onTimeout = fn(async function onTimeout() {
  this.state = 'candidate'
  this.term += 1
  election.call(this)
})

// algorithm end

export const raft: Algorithm = {
  rpcs: [],
  events: { onCheck, onRecovery, onTimeout },
}
