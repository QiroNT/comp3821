#import "../lib/template.typ": pc
= Progress

== Framework Implementation

== Bully Implementation

== Raft Implementation
Since we could not find reliable sources of pseudocode to translate, we implemented the raft algorithm based on #pc[@howard-raft] with reliance on the state diagram provided in the paper.
Whilst the paper provides code, it uses OCaml, a language which uses the functional paradigm, which clashes with our usage of TypeScript, largely an imperative language, making direct translation tricky.
To facilitate our implementation, we chose to follow the state diagram from the Raft paper, whilst implementing all operations and addressing all edge cases.
#figure(
  image("images/raft-state.png", width: 80%),
  caption: [
    The state transition diagram for the Raft algorithm. (Taken from #pc[@howard-raft])
  ],
)
To closely follow this, each transition state has its own function.
For example, we have implemented a function for a timeout event.
#figure(
  ```js
  const onTimeout = fn(async function onTimeout() {
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
  ```,
  caption: [A timeout event that starts a state transition in the raft algorithm]
)

All state transitions and corresponding functionality, such as a node increasing its vote count, have been implemented.
Our current challenge with the implementation is verifying its correctness.
We are also unsure whether we have covered all edge cases in the algorithm.

== Paxos Implementation
After finding a pseudocode example at #pc[@roohitavaf-paxos] and verifying it against #pc[@leslie-paxos], we implemented the Paxos algorithm by translating the pseudocode into TypeScript.
Since each node is able to act simultaneously as every role in Paxos, we opted to reduce the complexity of implementation by only using the article's classes as a collection of state for each role.
From there, each role's methods were treated as separated remote-call procedures which allows each node to operate on its own state when an RPC is called, creating an implementation that very closely follows the pseudocode.
As with the other algorithms, the implementation is yet to be fully verified, however this goal will be far simpler to achieve for Paxos as the pseudocode explanation could be more directly translated.

== Final Report
As our research and implementations have progressed, we have been adding to our final report.
As we have researched, we have added to our introduction which outlines leader election algorithms as well as key characteristics of the bully, raft and paxos algorithms.
Code that we write for testing will be directly added to the report with annotations added to describe functionality.

We have also structured our report with space to add findings, a discussion of the findings and correctness justification for our algorithms.