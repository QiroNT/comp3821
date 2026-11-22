#import "../lib/template.typ": pc

#let presentCode(file) = {
  let code = read(file).split("// algorithm start").at(1).split("// algorithm end").at(0).trim()
  raw(code, block: true, lang: "ts")
}

= Code <code>
All code can be found at #link("https://github.com/QiroNT/comp3821/tree/main/packages").
Additionally, complete extracts of the implementation for each algorithm can be found in @appendix.
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

Our implementation of Bully starts with performing health checks, both of the coordinator to other nodes using `onCheck`, and vice versa in `onTimeout`.
If any of these health checks indicate the leader is unhealthy, or there is an active election, any noticing node will trigger an election through `election.call`.

Starting the election phase, the unique ID is the value used to compared nodes to each other for the algorithm's leader determination.
The first RPC that is done is `areYouThere` to higher ID nodes, where any non-timeout response indicates a higher node exists, and this node should stop.
From there, the current highest ID node calls `abortOutstanding`, which cancels other requests to and from that node to ensure the election is uninterrupted.
This node then propagates a request to all lower nodes to do that same.
Finally, the new coordinator asserts itself through a `callAll` to `newCoordinator`, and informs every node to be healthy through a call to `ready`.

To maintain the synchronous assumption that is required for the Bully algorithm to function fully, all RPC calls are `async` and called with the `await` keyword.

Finally, to ensure correctness, manually built unit tests were created and confirmed to work on our implementation to iron out bugs

== Paxos
*Appendix Entry: @paxos-appendix*

We adapted the pseudocode described by #pc[@roohitavaf-paxos] for our implementation of the Paxos algorithm, opting to perform consensus on the proposer's ID to perform leader election.

Unlike the code above, node roles are not separated into separate classes, rather the state is globally accessible through a node's `proposer`, `acceptor`, and `learner` fields which are generated on start-up.
Each of these fields uses a described matching class to allow for type-safety, and each role's function implementations only access their respective fields.
Every remote call as described in the above article is transformed to use our RPC protocol, whereby the `callAll` method also calls back to the original node, which is crucial in ensuring a proposer also votes on and learns its own value.

When a node detects a timeout through `onTimeout()`, it activates the proposer role, setting its internal state before calling `acceptorPrepare` on all nodes.
From there, all acceptors either respond with a promise, or a nack if they have seen a greater proposal number.
Upon receiving a majority of promises, the initial proposer calls for an accept to all acceptors, who then again vote on the value sent, being the ID of the initial promiser.
Finally, once a majority of nodes accept the value, all nodes are informed of the new leader.

A caveat in our implementation is the usage of a globally shared proposal number.
For the sake of experimentation and reducing the number of experimental variables, we decided this implementation would be okay as it maintains the requirement that the proposal number be monotonically increasing.
While this has been implemented by using a single variable which all nodes access, this would not be feasible in reality as the shared value and increments would need to be communicated across nodes.
An alternative that would work in reality, accounting for latency between nodes communicating, would be to use a proposal number of $n*t+m$,
where $n$ is the size of the network, $t$ is the shared network time in milliseconds, and $m$ is the index of the node creating a proposal number.
However, since this algorithm for generating numbers is similarly constant time compared to the globally shared variable, there is no meaningful difference between the two.
Hence we opted for the simpler solution.

Similar to Bully, unit tests were created to validate the algorithm was translated from pseudocode correctly, with results from the tests matching what we expected.

== Raft
*Appendix Entry: @raft-appendix*

Since the Raft algorithm involves a leader election as the core part of reaching consensus, we focus on that stage for the implementation and testing of the algorithm.
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