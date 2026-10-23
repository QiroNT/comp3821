import type { Algorithm } from 'framework'
import { fn, rpc } from 'framework'

/* eslint prefer-arrow-callback: "off" */

// The node's expected properties/attributes:
/*
raftNode = {
    coordinator: a node that is the leader
    state:  'follower' | 'candidate' | 'leader'
    followerTimeout: a time
    candidateTimeout: a time
    leaderTimeout: a time
    term: positive integer starting from 0
    voted: boolean
    votes: positive integer starting from 0
}
*/

enum RaftState {
  FOLLOWER,
  CANDIDATE,
  LEADER,
}

// algorithm begin

// A candidate calls this to request a vote
const requestVote = rpc<boolean>()(async function requestVotes({ reply }) {
  if (this.state !== RaftState.FOLLOWER) {
    await reply(false)
    return
  }
  if (this.voted) {
    await reply(false)
  }
  else {
    this.voted = true
    await reply(true)
  }
})

// the heartbeat function called by a coordinator
// reply = True is an ACK
// reply = False or no response is a NACK
const appendEntry = rpc<boolean>()(async function appendEntry({ sender, reply }) {
  // TODO: reset timeout
  // a node will step down if term out of date
  if (this.term < sender.term) {
    this.state = RaftState.FOLLOWER
    this.coordinator = sender
  }
  await reply(true)
})

const election = fn(async function election() {
  // TODO: ELECTION!
  this.term += 1
})

const onCheck = fn(async function onCheck() {
  // only coordinator checks if all nodes are up.
  if (this.coordinator === this && this.state === RaftState.LEADER) {
    for (const node of this.network) {
      // check if all nodes are up
    }
  }
})

// When the system starts, or when the node recovers
const onRecovery = fn(async function onRecovery() {
  // initialise all the expected attributes
  // TODO ^^^
  this.state = RaftState.FOLLOWER
  this.term = 0
  // the node will now wait to timeout.
})

// a generic timeout event
const onTimeout = fn(async function onTimeout() {
  if (!this.state) {
    this.state = RaftState.FOLLOWER
  }
  if (this.state === 'follower') {
    this.state = RaftState.CANDIDATE
  }
  election.call(this)
})

// algorithm end

export const raft: Algorithm = {
  rpcs: [],
  events: { onCheck, onRecovery, onTimeout },
}
