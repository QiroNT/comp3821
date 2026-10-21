import type { Algorithm } from 'framework'
import { fn, rpc } from 'framework'

/* eslint prefer-arrow-callback: "off" */

/**
 * This procedure is called by coordinators to discover the state of a node.
 */
const areYouNormal = rpc<boolean>()(async function areYouNormal({ reply }) {
  if (this.state === 'normal') {
    await reply(true)
  }
  else {
    await reply(false)
  }
})

// algorithm start

// Sent by the leader as a heartbeat message
const leaderAlive = rpc()(async function areYouThere({ reply }) {
  await reply()
})

// The node attempts to be coordinator by calling this.
const requestVotes = fn(async function requestVotes() {

})

const election = fn(async function election() {
  this.state = 'candidate'
})

// algorithm end

// Taken from Bully
/**
 * This procedure is automatically called by the operating system when a node
 * starts up after a failure.
 */
const onRecovery = fn(async function onRecovery() {
  delete this.haltedBy
  await election.call(this)
})

/**
 * This procedure is called periodically by the operating system.
 */
const onCheck = fn(async function onCheck() {
  if (this.state === 'normal' && this.coordinator === this) {
    // I am coordinator. Check if everyone else is normal.
    for (const node of this.network) {
      const { status, response } = await node.call(areYouNormal)
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

/**
 * This procedure is called automatically when the node has not heard from the
 * coordinator in a "long" time.
 */
const onTimeout = fn(async function onTimeout() {
  if (this.state === 'normal' || this.state === 'reorganization') {
    // Check if coordinator is up.
    const { status } = await this.coordinator.call(areYouThere)
    if (status === 'timeout') {
      await election.call(this)
    }
  }
  else {
    await election.call(this)
  }
})

export const raft: Algorithm = {
  rpcs: [],
  events: { onRecovery, onCheck, onTimeout },
}
