#import "../lib/template.typ": pc

= Code

== Framework Description

=== The local state (`this`)

Each node has a permanent local state `this`. The algorithms are free to read/write whatever they want in the local
state.

Some parts of the local state are maintained by the framework itself. They are as follows.

- `this.id` contains an integer ID that is unique across all nodes in the network.
- `this.network` is an array of all the other nodes in the network, alive or not. The list stays constant for the
  duration of the election.
- `this.abortOutstanding` is a function that when called, cancels all other functions on the node currently waiting on
  an `await` point.

=== The node interface

The set of `node`s contained in `this.network` are provided with these functions.

- `node.id` is the node's ID.
- `node.call(name, ...parameters)`, which sends an RPC to the node when called.

  The function is asynchronous, and returns an object containing `status` and `response`.

  When the `status` is `'timeout'`, the RPC call has timed out and no reply has been received. Otherwise, the `response`
  contains the message sent by `reply()`.

=== Remote procedure calls (`@rpc`)

`@rpc` marks a function as a remote procedure call. The RPC can be invoke by other nodes via `node.call()`.

The first parameter received is the RPC context, which contains the following fields.

- `sender` is the node interface of the sender. It is guaranteed to be an element of `this.network`.
- `reply(message)`, which sends a reply back to the callee when called. This function is also asynchronous, and returns
  an object containing `status`.

The rest of the parameters are the parameters passed in `node.call()`.

== Bully

The bully algorithm presented by #pc[@garcia-bully] is transcribed as follows.

```js
/**
 * This procedure is used by remote nodes to discover if the node is operating.
 * Nothing is actually done at the node.
 */
@rpc
async function areYouThere({ reply }) {
    await reply()
}

/**
 * This procedure is called by coordinators to discover the state of a node.
 */
@rpc
async function areYouNormal({ reply }) {
    if (this.state == 'normal') {
        await reply(true)
    } else {
        await reply(true)
    }
}

/**
 * When a node receives this message, it means that the sender node is trying
 * to become coordinator.
 */
@rpc
function halt({ sender }) {
    this.state = 'election'
    this.haltedBy = sender
    this.abortOutstanding()
}

/**
 * The sender node uses this procedure to inform the receiver node that the
 * sender has become coordinator.
 */
@rpc
function newCoordinator({ sender }) {
    if (this.haltedBy == sender && this.state == 'election') {
        this.coordinator = sender
        this.state = 'reorganization'
    }
}

/**
 * Coordinator uses this procedure to distribute the new task description.
 */
@rpc
function ready({ sender }, description) {
    if (this.coordinator == sender && this.state == 'reorganization') {
        this.description = description
        this.state = 'normal'
    }
}

/**
 * By executing this procedure, the node attempts to become coordinator.
 */
async function election() {
    // First step is to check if any higher priority nodes are up. If any such
    // node is up, quit.
    for (const node of this.network.filter(node => node.id > this.id)) {
        const { status } = await node.call(areYouThere)
        if (status == 'timeout') {
            continue
        } else {
            return
        }
    }

    // Next, halt all lower priority nodes, starting with this node.
    this.abortOutstanding()
    this.state = 'election'
    this.haltedBy = this
    const up = []
    for (const node of this.network.filter(node => node.id < this.id)) {
        const { status } = await node.call(halt)
        if (status == 'timeout') {
            continue
        } else {
            up.push(node)
        }
    }

    // Now the node has reached its "election point." Next step is to inform
    // nodes of new coordinator.
    this.coordinator = this
    this.state = 'reorganization'
    for (const node of up) {
        const { status } = await node.call(newCoordinator)
        if (status == 'timeout') {
            // The node failed. The simplest thing is to restart.
            await election()
            return
        }
    }

    // The reorganization of the system occurs here. When done, the node has
    // computed `this.description`, the new task description.
    // (`this.description` probably contains a copy of `up`.) If during the
    // reorganization a node in `up` fails, the reorganization can be stopped
    // and a new reorganization started.
    for (const node of up) {
        const { status } = await node.call(ready, this.description)
        if (status == 'timeout') {
            await election()
            return
        }
    }

    this.state = 'normal'
}

/**
 * This procedure is automatically called by the operating system when a node
 * starts up after a failure.
 */
async function recovery() {
    delete this.haltedBy
    await election()
}

/**
 * This procedure is called periodically by the operating system.
 */
async function check() {
    if (this.state == 'normal' && this.coordinator == i) {
        // I am coordinator. Check if everyone else is normal.
        for (const node of this.network) {
            const { status, response } = await node.call(areYouNormal)
            if (status == 'timeout') {
                continue
            }
            if (response == false) {
                await election()
                return
            }
        }
    }
}

/**
 * This procedure is called automatically when the node has not heard from the
 * coordinator in a "long" time.
 */
async function timeout() {
    if (this.state == 'normal' || this.state == 'reorganization') {
        // Check if coordinator is up.
        const { status } = await this.coordinator.call(areYouThere)
        if (status == 'timeout') {
            await election()
        }
    } else {
        await election()
    }
}
```
