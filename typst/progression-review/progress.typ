#import "../lib/template.typ": pc
= Progress

== Framework Implementation

== Bully Implementation

== Raft Implementation
Since we could not find reliable sources of pseudocode to translate, we have implemented the raft algorithm based on #pc[@howard-raft] with reliance on the state diagram provided in the paper.
Whilst there was code provided in the paper, it was programmed in OCaml which utilised the functional paradigm.
This did not fit with our choice to use JavaScript, making direct translation tricky.
So we ultimately chose to follow the state diagram whilst implementing and ensure we address all edge cases and operations mentioned in the actual text of the paper.
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

All state transitions have been implemented and corresponding functionality, such as a node increasing its vote count, has also been implemented.
Our current challenge with the implementation is verifying its correctness.
We are unsure whether we've covered all edge cases in the algorithm.

== Paxos Implementation