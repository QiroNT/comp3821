import type { Algorithm } from 'framework'
import { fn, rpc } from 'framework'

/* eslint prefer-arrow-callback: "off" */
// algorithm start

/**
 * This procedure is used by remote nodes to discover if the node is operating.
 * Nothing is actually done at the node.
 */
const areYouThere = rpc()(async function areYouThere({ reply }) {
  await reply()
})

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

/**
 * When a node receives this message, it means that the sender node is trying
 * to become coordinator.
 */
const halt = rpc()(async function halt({ sender, reply }) {
  this.state = 'election'
  this.haltedBy = sender
  this.abortOutstanding()
  await reply()
})

/**
 * The sender node uses this procedure to inform the receiver node that the
 * sender has become coordinator.
 */
const newCoordinator = rpc()(async function newCoordinator({ sender, reply }) {
  if (this.haltedBy === sender && this.state === 'election') {
    this.coordinator = sender
    this.state = 'reorganization'
  }
  await reply()
})

/**
 * Coordinator uses this procedure to distribute the new task description.
 */
const ready = rpc()(async function ready({ sender, reply }) {
  if (this.coordinator === sender && this.state === 'reorganization') {
    this.assertLeader(sender)
    this.state = 'normal'
  }
  await reply()
})

/**
 * By executing this procedure, the node attempts to become coordinator.
 */
const election = fn(async function election() {
  // First step is to check if any higher priority nodes are up. If any such
  // node is up, quit.
  const higher = this.network.filter(node => node.id > this.id)
  for (const { status } of await this.callAll(higher, areYouThere)) {
    if (status !== 'timeout')
      return
  }

  // Next, halt all lower priority nodes, starting with this node.
  this.abortOutstanding()
  this.state = 'election'
  this.haltedBy = this
  const up = []
  const lower = this.network.filter(node => node.id < this.id)
  for (const { target, status } of await this.callAll(lower, halt)) {
    if (status !== 'timeout')
      up.push(target)
  }

  // Now the node has reached its "election point." Next step is to inform
  // nodes of new coordinator.
  this.coordinator = this
  this.state = 'reorganization'
  for (const { status } of await this.callAll(up, newCoordinator)) {
    if (status === 'timeout') {
      // The node failed. The simplest thing is to restart.
      await election.call(this)
      return
    }
  }

  // The reorganization of the system occurs here. When done, the node has
  // computed `this.description`, the new task description.
  // (`this.description` probably contains a copy of `up`.) If during the
  // reorganization a node in `up` fails, the reorganization can be stopped
  // and a new reorganization started.
  for (const { status } of await this.callAll(up, ready)) {
    if (status === 'timeout') {
      await election.call(this)
      return
    }
  }

  this.assertLeader(this)
  this.state = 'normal'
})

/**
 * This procedure is automatically called by the operating system when a node
 * starts up after a failure.
 */
const onRecovery = fn(async function onRecovery() {
  this.scheduleCheck(true)
  this.scheduleTimeout(true)

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

// algorithm end

export const bully: Algorithm = {
  rpcs: [areYouNormal, areYouThere, halt, newCoordinator, ready],
  events: { onCheck, onRecovery, onTimeout },
}
