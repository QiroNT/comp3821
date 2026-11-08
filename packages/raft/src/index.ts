import type { Algorithm } from 'framework'
import { fn, rpc } from 'framework'

/* eslint prefer-arrow-callback: "off", ts/no-use-before-define: "off" */

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

// reset timeout
const resetTimeout = fn(function resetTimeout() {
  this.clearTimeout(this.timer)
  this.timer = this.setTimeout(onTimeout, this.params.checkTimeout)
})

// A candidate calls this to request a vote
const requestVote = rpc<boolean>()(async function requestVotes({ sender, reply }) {
  // a node discovers that this is a new term
  if (this.term < sender.term) {
    this.voted = false
    this.state = RaftState.FOLLOWER
  }
  if (this.state === RaftState.LEADER) {
    // TODO: randomised backoff
  }
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
  // a node will step down if term out of date
  if (this.term < sender.term) {
    this.state = RaftState.FOLLOWER
    this.coordinator = sender
    this.term = sender.term
    this.voted = false
  }

  // reset timeout
  resetTimeout.call(this)

  await reply(true)
})

const election = fn(async function election() {
  this.term += 1

  // vote for self
  this.votes = 1
  this.voted = true

  // request votes from every node
  for (const node of this.network) {
    const { status, response } = await node.call(requestVote)
    if (status === 'timeout') {
      // TODO: Should we assume that there is now one less voter?
    }
    this.votes += response ? 1 : 0
  }

  // become leader if win
  if (this.votes > this.network.length / 2) {
    this.state = RaftState.LEADER
    // send initial heartbeat messages
    this.callAll(this.network, appendEntry)
    this.coordinator = this
  }
  else {
    // remain a candidate
    this.state = RaftState.CANDIDATE
  }
  // no matter the result, a timeout starts
  resetTimeout.call(this)
})

const onCheck = fn(async function onCheck() {
  // only coordinator checks if all nodes are up.
  if (this.coordinator === this && this.state === RaftState.LEADER) {
    for (const node of this.network) {
      const { status, response } = await node.call(appendEntry)
      if (status === 'timeout') {
        continue
      }
      if (response === false) {
        await election.call(this)
        return
      }
    }
  }
})

// a generic timeout event
const onTimeout = fn(async function onTimeout() {
  resetTimeout.call(this)

  if (this.state === RaftState.FOLLOWER) {
    this.state = RaftState.CANDIDATE
    election.call(this)
  }
  if (this.state === RaftState.CANDIDATE) {
    election.call(this)
  }
  if (this.state === RaftState.LEADER) {
    // send heartbeat pulses
    for (const node of this.network) {
      await node.call(appendEntry)
    }
  }
})

// When the system starts, or when the node recovers
const onStart = fn(async function onStart() {
  // initialise all the expected attributes
  // TODO ^^^
  this.state = RaftState.FOLLOWER
  this.term = 0
  // the node will now wait to timeout.
  resetTimeout.call(this)
})

// algorithm end

export const raft: Algorithm = {
  rpcs: [],
  events: { onStart },
}
