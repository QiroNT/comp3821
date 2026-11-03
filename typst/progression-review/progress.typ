#import "../lib/template.typ": pc
= Progress

== Framework

We have made a framework as a basis for our algorithm implementations. This is to make our algorithm code adaptable for
different network and testing conditions, and to minimize the variance between our references and implementations.

The framework provides storage for each node's state, and facilities to communicate between nodes. We will be referring
to the calling facility as Remote Procedure Calls (RPC).

The remote procedure call facility allows a node to send messages to other nodes and receive replies, in the form of an
asynchronous function call. This is to mimic the request response model in HTTP, such that it allows the algorithm code
to run in any environment that supports HTTP transport. This will be useful for our real world testing in a later stage.

In addition, the framework also triggers some events in the algorithms. They provide an entry point, and ways of
notifying the algorithm of network changes.

To provide an ending condition, each node is provided with a method to notify the framework that it has acknowledged the
leader. This method is used to provide unit testing methods for our simulator, and will be used as the basis for time
measurements.

== Unit Testing

In order to unit test our algorithm implementations, we have built a deterministic simulator. It starts up a simulated
network, and runs the algorithms until a leader consensuses is reached. The framework helps us catch bugs in our
implementation, and get an early glance into the behaviours of the algorithms.

The simulator has configurable parameters for networking latency and timeout, and configurable intervals for events.
This allows us to vary the network latency within a topology and verify that, for example, network conditions that are
unsolvable should never reach a consensus.

For debugging purposes, the simulator records a log of all messages sent between the nodes. Every test file hence
includes a copy of their log. This way, we can visualize the interaction between nodes to spot any anomalies. It also
allow us to track the effects of the changes we make.

== Bully Implementation

The pseudocode for the Bully algorithm was retrieved from #pc[@garcia-bully], then translated into our framework.

The paper's pseudocode is written in an Algol-like languages, and has an event based structure. Our framework is
designed based on this implementation, thus we performed a nearly one to one translation.

One difference between the pseudocode and our translation is that, while the pseudocode assumes a parallel (threaded)
environment, our translation does not. This means that our translation would perform worse compute vise. However, since
we can assume that network latency should dominate the total time, this should have negotiable impact on the performance
of the algorithm.

== Raft Implementation
Since we could not find reliable sources of pseudocode to translate, we implemented the raft algorithm based on
#pc[@howard-raft] with reliance on the state diagram provided in the paper. Whilst the paper provides code, it uses
OCaml, a language which uses the functional paradigm, which clashes with our usage of TypeScript, largely an imperative
language, making direct translation tricky. To facilitate our implementation, we chose to follow the state diagram from
the Raft paper, whilst implementing all operations and addressing all edge cases.
#figure(
  image("images/raft-state.png", width: 80%),
  caption: [
    The state transition diagram for the Raft algorithm. (Taken from #pc[@howard-raft])
  ],
)
To closely follow this, each transition state has its own function. 
// For example, we have implemented a function for a
timeout event.
// #figure(
  // ```js
  // const onTimeout = fn(async function onTimeout() {
    // if (this.state === RaftState.FOLLOWER) {
      // this.state = RaftState.CANDIDATE
      // election.call(this)
    // }
    // if (this.state === RaftState.CANDIDATE) {
      // election.call(this)
    // }
    // if (this.state === RaftState.LEADER) {
      send heartbeat pulses
      // for (const node of this.network) {
        // await node.call(appendEntry)
      // }
    // }
  // })
  // ```,
  // caption: [A timeout event that starts a state transition in the raft algorithm],
// )
All state transitions and corresponding functionality, such as a node increasing its vote count, have been implemented.
Our current challenge with the implementation is verifying its correctness. We are also unsure whether we have covered
all edge cases in the algorithm.

== Paxos Implementation
After finding a pseudocode example at #pc[@roohitavaf-paxos] and verifying it against #pc[@leslie-paxos], we implemented
the Paxos algorithm by translating the pseudocode into TypeScript. Since each node is able to act simultaneously as
every role in Paxos, we opted to reduce the complexity of implementation by only using the article's classes as a
collection of state for each role. From there, each role's methods were treated as separated remote-call procedures
which allows each node to operate on its own state when an RPC is called, creating an implementation that very closely
follows the pseudocode. As with the other algorithms, the implementation is yet to be fully verified, however this goal
will be far simpler to achieve for Paxos as the pseudocode explanation could be more directly translated.

== Final Report
As our research and implementations have progressed, we have been adding to our final report. As we have researched, we
have added to our introduction which outlines leader election algorithms as well as key characteristics of the bully,
raft and paxos algorithms. Code that we write for testing will be directly added to the report with annotations added to
describe functionality.

We have also structured our report with space to add findings, a discussion of the findings and correctness
justification for our algorithms.
