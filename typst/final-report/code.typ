#import "../lib/template.typ": pc

#let presentCode(file) = {
  let code = read(file).split("// algorithm start").at(1).split("// algorithm end").at(0).trim()
  raw(code, block: true, lang: "ts")
}

= Code <code>
All code can be found here: #link("https://github.com/QiroNT/comp3821/tree/main/packages")
Additionally, complete extracts the implementation for each algorithm can be found in @appendix.
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

//TODO: add a link for the appendix
The Bully algorithm presented by #pc[@garcia-bully] is transcribed in the Appendix.

== Paxos
*Appendix Entry: @paxos-appendix*

We have adapted the plain English and pseudocode described by #pc[@roohitavaf-paxos] for our concrete implementations.
Additionally, while Paxos is not specifically designed for leader election, as a consensus algorithm, it can be modified to come to a consensus for a leader.

== Raft
*Appendix Entry: @raft-appendix*

//Potential TODO: turn code snippets into appendix references.

Since the Raft algorithm involves a leader election as the core part of reaching concensus, we focus on that stage for the implementation and testing of the algorithm.
This means that we have not implemented anything from the log replication stage.

The most important functions for leader election in the Raft algorithm are `requestVote()`, `onTimeout()` and `appendEntry()`
These main functions describe the state transitions that raft undergoes.
Additionally, the `election()` function contains logic for the election, though it could be considered a part of `onTimeout()` as it is exclusively called from there.

//TODO: insert each function and describe their basic functionality.
`onTimeout()` handles state changes caused by various timeouts.
For example, if it is called when the node is a leader, it moves to be a candidate and starts an election cycle.
If it is called when the node is a candidate, then it also starts a new election cycle.
A timeout when the node is a leader indicates it is time to send the heartbeat pulses of `appendEntry()`.
```js
const onTimeout = fn(async function onTimeout() {
  resetTimeout.call(this)

  if (this.state === RaftState.FOLLOWER) {
    this.state = RaftState.CANDIDATE
    await election.call(this)
  }
  else if (this.state === RaftState.CANDIDATE) {
    await election.call(this)
  }
  else if (this.state === RaftState.LEADER) {
    // send heartbeat pulses
    this.callAll(this.network, appendEntry, this.term)
  }
}
```

Each election cycle consists of:
+ requesting votes from all other nodes
+ becoming a leader if a majority is received
+ waiting as a candidate for a new cycle
```js
const election = fn(async function election() {
  this.clearTimeout()
  this.term += 1

  let votes = 1

  // vote for self
  this.voted = true

  // request votes from every node
  let network_size = this.network.length
  const responses = parallel(this.network.map(node => () => node.call(requestVote, this.term)))

  let win = false
  for await (const res of responses) {
    const { status, response } = res
    if (status === 'timeout') {
      // Assume one less voter
      network_size -= 1
    }
    votes += response ? 1 : 0

    if (votes > network_size / 2) {
      win = true
      break
    }
  }

  // become leader if win
  if (win) {
    this.state = RaftState.LEADER
    // send initial heartbeat messages
    this.callAll(this.network, appendEntry, this.term)
    this.coordinator = this
    this.assertLeader(this)
    resetTimeout.call(this)
  }
  else {
    // remain as a candidate
    this.state = RaftState.CANDIDATE
    resetTimeout.call(this, this.random.float(100, 350))
  }
})
```

While processing a request for a vote from a candidate node, other nodes can realise that they are in the wrong term and update themselves accordingly.
Apart from this, a randomised backoff handles receiving a request vote as a leader which indicates a collision and basic response to voting occurs otherwise.
```js
// A candidate calls this to request a vote
const requestVote = rpc<boolean>()(async function requestVotes({ reply }, currTerm: number) {
  // a node discovers that this is a new term
  if (this.term < currTerm) {
    this.voted = false
    this.state = RaftState.FOLLOWER
    this.term = currTerm
  }
  if (this.state === RaftState.LEADER) {
    this.state = RaftState.FOLLOWER
    resetTimeout.call(this, this.random.float(100, 350))
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
```

Other functions you found in the appendix entry for raft are for organising logic and interactions with the simulator.

