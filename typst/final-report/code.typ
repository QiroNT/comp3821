#import "../lib/template.typ": pc

#let presentCode(file) = {
  let code = read(file).split("// algorithm start").at(1).split("// algorithm end").at(0).trim()
  raw(code, block: true, lang: "ts")
}

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

  This function takes a parameter `tag`, which specifies what type of pending functions are aborted. By default it is
  `rpc`, meaning that only in flight rpc responses are aborted. Available tags are `rpc`, `onCheck`, and `onTimeout`.
- `this.scheduleCheck` schedules the algorithm's `onCheck` function to be called on the current node. This function
  takes in a `repeat` parameter, to specify whether `onCheck` should be called on an interval, or just once.
- `this.scheduleTimeout` schedules the algorithm's `onTimeout` function to be called on the current node. This function
  also takes in a `repeat` parameter, to specify whether `onTimeout` should be called on an interval, or just once.
- `this.assertLeader` is a function which signals to the framework that the current node thinks this node is the leader.
  This is used as a stop condition, when all nodes have called `assertLeader` with the same leader node.
- `this.callAll` is a utility function that broadcasts an RPC to an array of nodes.

=== The node interface

The set of `node`s contained in `this.network` are provided with these functions.

- `node.id` is the node's ID.
- `node.call(name, ...parameters)`, which sends an RPC to the node when called.

  The function is asynchronous, and returns an object containing `target`, `status` and `response`.

  When the `status` is `'timeout'`, the RPC call has timed out and no reply has been received. Otherwise, the `response`
  contains the message sent by `reply()`.

=== Remote procedure calls (`rpc`)

`rpc` marks a function as a remote procedure call. The RPC can be invoke by other nodes via `node.call()`.

The first parameter received is the RPC context, which contains the following fields.

- `sender` is the node interface of the sender. It is guaranteed to be an element of `this.network`.
- `reply(message)`, which sends a reply back to the callee when called. This function is also asynchronous, and returns
  an object containing `status`.

The rest of the parameters are the parameters passed in `node.call()`.

== Bully

The Bully algorithm presented by #pc[@garcia-bully] is transcribed as follows.

#presentCode("../../packages/bully/src/index.ts")

== Raft

== Paxos

We have adapted the plain English and pseudocode described by #pc[@roohitavaf-paxos] for our concrete implementations.
Additionally, while Paxos is not specifically designed for leader election, as a consensus algorithm, it can be modified to come to a consensus for a leader.
