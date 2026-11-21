#import "../lib/template.typ": pc

#let presentCode(file) = {
  let code = read(file).split("// algorithm start").at(1).split("// algorithm end").at(0).trim()
  raw(code, block: true, lang: "ts")
}

= Code <code>
All code can be found here: #link("https://github.com/QiroNT/comp3821/tree/main/packages")
Additionally, complete extracts the implementation for each algorithm can be found in @appendix.
We recommend having the codebase, or the appendix open while reading this section.
== Framework Description

=== The local state (`this`)

Each node has a permanent local state `this`. The algorithms are free to read/write whatever they want in the local
state.

Some parts of the local state are maintained by the framework itself. They are as follows.

- `this.id` contains an integer ID that is unique across all nodes in the network.
- `this.network` is an array of all the other nodes in the network, alive or not. The list stays constant for the
  duration of the election.
- `this.config` contains the `params` field for the algorithm.
- `this.abortOutstanding` is a function that when called, cancels all other functions on the node currently waiting on
  an `await` point.
- `this.setTimeout` schedules a function to be called after some delay, returning a handle to the timer.
- `this.clearTimeout` removes a scheduled timer.
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
*Appendix Entry: @bully-appendix*

The Bully algorithm presented by #pc[@garcia-bully] was translated in JavaScript almost line for line.
TODO: Rewrite
, and our RPCs use the paper's procedure names (`AreYouThere`, `Halt`, `NewCoordinator`, `Ready`).
Each node has a unique priority (its identifier).
A node starting an election first asks every higher-priority node whether it is alive.
If any replies, it defers to it; otherwise it halts every lower-priority node, announces itself as the new coordinator, and distributes the new state with `Ready`.
The live node with the highest identifier therefore always wins.

== Paxos
*Appendix Entry: @paxos-appendix*

// TODO: add details about Paxos implementation
We have adapted the plain English and pseudocode described by #pc[@roohitavaf-paxos] for our concrete implementations.
Additionally, while Paxos is not specifically designed for leader election, as a consensus algorithm, it can be modified to come to a consensus for a leader.
TODO: Rewrite
+ *Prepare / Promise.* A proposer sends `Prepare(n)` to the acceptors. An acceptor that has not promised a higher number promises to ignore proposals numbered below $n$, and replies with the highest-numbered proposal it has already accepted, if any.
+ *Accept / Accepted.* Once a majority has promised, the proposer sends `Accept(n, v)`. Here $v$ must be the value of the highest-numbered proposal reported in the promises, and the proposer may use its own value only if none was reported. An acceptor accepts unless it has since promised a higher number.


== Raft
*Appendix Entry: @raft-appendix*

Since the Raft algorithm involves a leader election as the core part of reaching concensus, we focus on that stage for the implementation and testing of the algorithm.
This means that we have not implemented anything from the log replication stage.

The most important functions for leader election in the Raft algorithm are `requestVote()`, `onTimeout()` and `appendEntry()`
These main functions describe the state transitions that raft undergoes.
Additionally, the `election()` function contains logic for the election, though it could be considered a part of `onTimeout()` as it is exclusively called from there.

`onTimeout()` handles state changes caused by various timeouts.
For example, if it is called when the node is a leader, it moves to be a candidate and starts an election cycle.
A timeout when the node is a leader indicates it is time to send the heartbeat pulses of `appendEntry()`.
If the timeout occurs when the node is a candidate, then it also starts a new election cycle.

Each election cycle consists of:
+ requesting votes from all other nodes
+ becoming a leader if a majority is received
+ waiting as a candidate for a new cycle

While processing a request for a vote from a candidate node, other nodes can realise that they are in the wrong term and update themselves accordingly.
Apart from this, a randomised backoff handles receiving a request vote as a leader which indicates a collision and basic response to voting occurs otherwise.

Other functions you found in the appendix entry for raft are for organising logic and interactions with the simulator.

To verify correctness of the implementation, we used unit tests to compare output logs and results with hand calculated expected results.
We also compared the state transitions present in the algorithm to the state diagram presented in @howard-raft.
#figure(image("images/raft-state.png"), caption: [The state transition diagram from @howard-raft that was used to verify correctness of the raft algorithm implementation.])