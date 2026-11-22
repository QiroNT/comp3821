#import "../lib/template.typ": pc

= Background <background>

This section introduces the three algorithms we compared, the necessary assumptions each one makes to ensure correctness, and what we predict about their behaviour in our experiments.

== Leader Election, Consensus and Timing Models

Leader Election algorithsm aim to solve the problem in distributed computing of deciding which node should act as a coordinator for others.
There are 3 main requirements that an algorithm must fulfil to validly elect a leader #pc[@leader-election-requirements].
These are uniqueness, that only one healthy process considered leader, agreement, that all nodes agree that node is leader, and scale, essentially that the algorithm terminates. 

The Bully, Raft, and Paxos algorithms were each designed to solve different problems.
Bully was designed as a leader election algorithm, whereas Paxos and Raft were designed as consensus algorithms, a more general set of algorithms where rather than selecting a node as leader, one or more values are selected to be shared across and agreed upon by each node.
We modify Raft and Paxos such that the value upon consensus is reaches is the identifier of a to-be leader node, allowing no functional modification to both while maintaining correctness under the same assumptions. 
In later sections we outline the specific implementation decisions made that convert each consensus algorithm to leader election.

The algorithms also differ in what their assumptions about timing across the network. We define the terms we use to describe each assumptions as follows:
- *Synchronous*: Every network message will arrive within a known bound of time, allowing a missing or timed-out reply to guarantee that recipient node has crashed.
- *Asynchronous*: Conversely, that there is no such bound, so a slow node cannot be distinguished from a crashed one.
#pc[@flp-impossibility] proved that no deterministic algorithm can guarantee consensus in an asynchronous system if even one node crashes.

While Raft and Paxos never violate agreement in asynchronous systems and only rely on the network eventually responding to make progress toward consensus, a model called partial synchrony @dls-partial-synchrony exists that guarantees completion in both.
Unlike true asynchronicity, which is rare in practice due to the synchronicity of the network through message timeouts and the synchronicity of CPUs, partial synchrony uses these practical gaps to guarantee that consensus algorithms will complete.
The reason this assumptions allows these algorithms to complete where full asynchronicity would fail is that unlike asynchronicity where messages must be waited for eternally, so Raft and Paxos may be stuck waiting for votes that will never arrive, enforcing that network requests have a maximum time to deliver means all nodes in the process will eventually update their state and continue processing.
This assumption will have little effect on the results of these algorithms, as by using standard computers, these assumptions are baked into the runtime itself across all environments.

== Bully

The Bully Algorithm as described by #pc[@garcia-bully] aims to ensure the node with the highest ID in the system becomes the new leader of the distributed system.
Simply, the first node to notice the a heartbeat request to the leader times out, indicating the leader has gone down, initiates an election by calling out to every node with a higher ID than itself.
If any of these requests get a response, it means that the instigator node does not have the highest ID, and should concede the election to any of the higher ID nodes.
For each healthy high ID node that is notified that a lower ID node is trying to become leader, the higher ID node will respond, and then start its own election through an identical process.
Once a node receives no responses, it means it has the highest ID in the pool, and then sends out a notification to all other nodes that it is now the leader.

The paper, and hence our experimentation for Bully, makes the relevant assumptions that a node failure occurs via a crash, that the network never drops a message, a timeout on a message indicates a node as failed, and all healthy nodes respond to requests immediately.
Most crucially, Bully assumes the network is synchronous so the impossibility condition never arises and Bully always runs correctly.
Under these assumptions Bully is known to satisfy the requirements of a leader election algorithm.

**TODO**: Clean this up, I'm not really sure about the maths, it seems slightly suspect especially the conclusion (now removed, we never expected bully to be fastest)
*Simple Predicted Runtime.* We will consider a fully connected network containing $n$ nodes where all connections have fixed latency $d$.
If every node begins an election at once to match our simulator, the highest ID node will use three round-trip requests (`Halt`, `NewCoordinator`, `Ready`) causing the leader to settle after $6d$.
Furthermore, every node sends `AreYouThere` to all higher ID nodes, generating $n(n-1)\/2$ requests, plus an additional $3(n-1)$ requests from the winner, each with a reply.
The message count is therefore $Theta(n^2)$.
Our test with $n = 5$ and $d = 1$ matches both predictions: the leader settles at time $6.0$ after $10 + 12 = 22$ requests.

== Raft

Raft @ongaro-raft divides time into numbered *terms*, each beginning with an election.
Every node starts as a follower.
If a follower hears nothing from a leader within its *election timeout*, it becomes a candidate, increments its term, votes for itself and requests votes from all other nodes.
Each node grants at most one vote per term, and a candidate that receives votes from a majority becomes leader and immediately sends heartbeats (`AppendEntries()`).

*Why there is at most one leader per term.*
Any two majorities of the same set of nodes must share at least one node, and that node votes only once per term.
So two candidates cannot both collect a majority in the same term.
Unlike Bully, this guarantee does not depend on timing.
A leader isolated by a partition may still believe it leads in an older term, but it cannot win votes, and it steps down when it sees a higher term.

*Randomised timeouts.*
If several followers time out at nearly the same moment, the votes split, nobody wins, and a new term is needed.
Raft makes this unlikely by choosing each timeout at random, and the paper's experiments show that even a small range of randomness greatly reduces split votes; the authors suggest $150$--$300$ ms.
Raft also requires the time to broadcast a message to be much smaller than the election timeout.

**TODO:** Review
*Predicted cost.*
If timeouts are drawn uniformly from $[a, b]$, the first of $n$ nodes times out after an expected $a + (b - a)\/(n + 1)$.
Without a split vote, the candidate then needs one round trip to collect votes and one more message for followers to learn the leader, so the election should settle after roughly $a + (b-a)\/(n+1) + 3d$, using $O(n)$ messages.
This gives a testable trade-off.
As $n$ grows, the first timeout comes sooner, but it becomes more likely that a second node times out within $d$ of the first and splits the vote.
Similarly, a narrow timeout range speeds up the first timeout but increases split votes.

Note that our project uses only Raft's election mechanism.
Raft also restricts votes to candidates whose logs are at least as up to date as the voter's; since we replicate no log, this rule has no effect in our setting.

== Paxos

Paxos is a consensus algorithm that ensures all nodes in a system decide and agree on a singe value #pc[@leslie-paxos].
Each node in the system holds any of the following three roles at once:
1. Proposer, where the node tries to become a temporary leader, then proposes a value.
2. Acceptor, where the node votes on proposers, and then their value.
3. Learner, where the node learns the outcome of the election and commits it. 
//@lamport-part-time @lamport-paxos-simple 
Each proposal has a unique, monotonically increasing proposal number.
Once a majority of acceptors promise to follow a proposer, that proposer then is allowed to propose its value.
After that, the acceptors then vote to accept the value, and once a majority is reached, the proposer sends out the value and all nodes become learners of that value.

*Liveness.*
Paxos is not guaranteed to complete as two proposers can repeatedly issue proposals of greater value and cancel the other indefinitely.
#pc[@leslie-paxos] notes that to reliably pick a single proposer, an implementation must use randomness, such as exponential backoffs, or real time.
Since we assume the partial synchrony model, we guarantee that Paxos will always produce a result.
However, the runtime should depend heavily on how proposers' timeouts are spread out, as with Raft.

*Predicted Runtime.*
We will consider a fully connected network containing $n$ nodes where all connections have fixed latency $d$. If a single node acts as a proposer, the election will take two round-trip requests to every node, along with another one-way message to update learners with the new leader.
From an election starting to the end, this gives $5d$ time to complete in $O(n)$ messages.
However, introducing other proposers introduces the possibility of additional election rounds, meaning we expect a high variance and the low risk of tests that do not terminate.

== Comparison

#figure(
  table(
    columns: 4,
    align: left,
    table.header([], [*Bully*], [*Raft*], [*Paxos*]),
    [Problem solved], [Leader election], [Consensus on a log], [Consensus on one value],
    [Timing model], [Synchronous], [Partial synchrony], [Partial synchrony],
    [Decides by], [Highest identifier], [Majority vote per term], [Majority of acceptors],
    [Two leaders possible?], [Yes, if timeouts are wrong], [Not in the same term], [No (one value chosen)],
    [Guaranteed to finish?], [Yes, under synchrony], [No; randomness makes it likely], [No; can livelock],
    [Messages per election], [$Theta(n^2)$ at start-up], [$O(n)$ per term], [$O(n)$ per round],
    [Predicted time (no failures)], [$6d$], [$~ a + (b-a)\/(n+1) + 3d$], [$~ T + 5d$],
  ),
  caption: [Summary of the three algorithms for $n$ fully connected nodes with one-way latency $d$.],
) <tab-comparison>
