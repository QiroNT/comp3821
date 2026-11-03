#import "../lib/template.typ": template, pc
#import "./config.typ": *

#show: template.with(
  title: [Evaluating Leader Election Algorithms - Progress Report],
  enum-numbering: "1.",
)

#include "./coverpage.typ"
#include "introduction.typ"
#include "progress.typ"

= Background Research

This section summarises what we have learned about the three algorithms, the assumptions each one makes about the network, and what this theory predicts about our experiments.
It also records issues we found when checking our implementations against the original papers.

== Leader Election, Consensus and Timing Models

Bully and Raft were designed for different problems.
Bully is a *leader election* algorithm: it chooses a coordinator, but does not on its own guarantee that two nodes never act as coordinator at the same time.
Raft and Paxos are *consensus* algorithms: a set of nodes agree on a single value (Paxos) or a sequence of values (Raft), and once a value is chosen it never changes.
Leader election can be expressed as consensus on the value "the identifier of the leader", which is how we use Raft and Paxos in this project.

The algorithms also differ in what they assume about message timing.
In a *synchronous* system, every message arrives within a known bound, so a missing reply reliably means the other node has crashed.
In an *asynchronous* system, there is no such bound, so a slow node cannot be distinguished from a crashed one.
#pc[@flp-impossibility] proved that no deterministic algorithm can guarantee consensus in an asynchronous system if even one node may crash.
Practical algorithms respond to this result in one of two ways.
Bully assumes synchrony, so it is fast but can produce incorrect results when the assumption fails.
Raft and Paxos never violate safety (agreement) under asynchrony, and only rely on the network being "eventually" well-behaved to make progress, a model called *partial synchrony* @dls-partial-synchrony.
This difference shapes what "speed" means for each algorithm, and is why we expect them to respond differently to high or variable latency.

== Bully

Our implementation follows the procedures given by #pc[@garcia-bully], and our RPCs use the paper's procedure names (`AreYouThere`, `Halt`, `NewCoordinator`, `Ready`).
Each node has a unique priority (its identifier).
A node starting an election first asks every higher-priority node whether it is alive.
If any replies, it defers to it; otherwise it halts every lower-priority node, announces itself as the new coordinator, and distributes the new state with `Ready`.
The live node with the highest identifier therefore always wins.

The paper assumes that nodes fail only by crashing, that messages are not lost, and that a node that does not reply within a time limit has failed.
These are synchronous assumptions.

*Predicted cost.*
Consider $n$ fully connected nodes with uniform one-way latency $d$, where every node begins an election at once, as in our simulator's start-up.
The highest node needs three request--reply round trips (`Halt`, `NewCoordinator`, `Ready`), so the leader should settle after $6d$.
Every node sends `AreYouThere` to each higher node, giving $n(n-1)\/2$ requests, plus $3(n-1)$ requests from the winner, each with a reply.
The message count is therefore $Theta(n^2)$.
Our test with $n = 5$ and $d = 1$ matches both predictions: the leader settles at time $6.0$ after $10 + 12 = 22$ requests.

*Observed failure of the timing assumption.*
Our second Bully test sets the latency ($100$) far above the reply timeout ($1$), so every reply is treated as a crash.
In the log, node $0$ and node $4$ both declare themselves leader, and the simulation never settles.
This is a "split brain": the algorithm's correctness depends on the timeout being longer than the true message delay.
We therefore expect Bully to be the fastest algorithm when latency is low and predictable, and to fail outright, rather than merely slow down, when the timeout is set too aggressively for the network.

== Raft

Raft @ongaro-raft divides time into numbered *terms*, each beginning with an election.
Every node starts as a follower.
If a follower hears nothing from a leader within its *election timeout*, it becomes a candidate, increments its term, votes for itself and requests votes from all other nodes.
Each node grants at most one vote per term, and a candidate that receives votes from a majority becomes leader and immediately sends heartbeats (`AppendEntries`).

*Why there is at most one leader per term.*
Any two majorities of the same set of nodes must share at least one node, and that node votes only once per term.
So two candidates cannot both collect a majority in the same term.
Unlike Bully, this guarantee does not depend on timing.
A leader isolated by a partition may still believe it leads in an older term, but it cannot win votes, and it steps down when it sees a higher term.

*Randomised timeouts.*
If several followers time out at nearly the same moment, the votes split, nobody wins, and a new term is needed.
Raft makes this unlikely by choosing each timeout at random, and the paper's experiments show that even a small range of randomness greatly reduces split votes; the authors suggest $150$--$300$ ms.
Raft also requires the time to broadcast a message to be much smaller than the election timeout.

*Predicted cost.*
If timeouts are drawn uniformly from $[a, b]$, the first of $n$ nodes times out after an expected $a + (b - a)\/(n + 1)$.
Without a split vote, the candidate then needs one round trip to collect votes and one more message for followers to learn the leader, so the election should settle after roughly $a + (b-a)\/(n+1) + 3d$, using $O(n)$ messages.
This gives a testable trade-off.
As $n$ grows, the first timeout comes sooner, but it becomes more likely that a second node times out within $d$ of the first and splits the vote.
Similarly, a narrow timeout range speeds up the first timeout but increases split votes.

Note that our project uses only Raft's election mechanism.
Raft also restricts votes to candidates whose logs are at least as up to date as the voter's; since we replicate no log, this rule has no effect in our setting, and we should say so when comparing with the full algorithm.

== Paxos

Paxos @lamport-part-time @leslie-paxos reaches agreement on a single value.
Nodes play three roles: *proposers* suggest values, *acceptors* vote on them, and *learners* find out the outcome.
Each proposal has a unique, increasing proposal number.

+ *Prepare / Promise.* A proposer sends `Prepare(n)` to the acceptors. An acceptor that has not promised a higher number promises to ignore proposals numbered below $n$, and replies with the highest-numbered proposal it has already accepted, if any.
+ *Accept / Accepted.* Once a majority has promised, the proposer sends `Accept(n, v)`. Here $v$ must be the value of the highest-numbered proposal reported in the promises, and the proposer may use its own value only if none was reported. An acceptor accepts unless it has since promised a higher number.

A value is chosen once a majority of acceptors accept it.
The key invariant is that once a value $v$ is chosen, every higher-numbered proposal also carries $v$.
The rule in step 2 is what preserves this: any majority that promises to a later proposal overlaps the majority that accepted $v$, so the later proposer learns $v$ and must adopt it.

*Liveness.*
Paxos never chooses two values, but it is not guaranteed to finish.
Two proposers can repeatedly issue higher numbers and cancel each other's `Prepare` phase indefinitely.
#pc[@leslie-paxos] notes that a reliable way to pick a single proposer must use randomness or real time, for example timeouts.
For us this means Paxos election time should depend heavily on how proposers' timeouts are spread out, as with Raft.

*Predicted cost.*
With a single proposer, the election takes two round trips plus one message to inform learners, roughly $T + 5d$ after the first timeout $T$, using $O(n)$ messages.
With competing proposers, we expect much higher variance and occasional runs that do not terminate within our step limit.

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
    [Predicted time (no failures)], [$6d$], [$approx a + (b-a)\/(n+1) + 3d$], [$approx T + 5d$],
  ),
  caption: [Summary of the three algorithms for $n$ fully connected nodes with one-way latency $d$.],
)

== Implications for Our Experiments

*Network topology.*
Our introduction describes leader election in networks where nodes can only message their neighbours.
That model suits algorithms designed for rings or general graphs, but all three algorithms we chose assume any node can message any other directly.
Our simulator reflects this: calling a non-neighbouring node raises an error.
Topology experiments therefore need to be reframed, for example as non-uniform latency between pairs of nodes, or supported by adding multi-hop message routing.
We would like the mentor's view on which is more appropriate.

*Checking implementations against the papers.*
Comparing our code with the sources above revealed issues that would invalidate timing results if left unfixed:
- *Raft:* the receiver reads the sender's term from the node reference, which does not carry it, so terms never propagate; the term should be passed as an argument. A follower that times out runs its election twice, because the candidate branch also executes. Votes are requested one node at a time rather than in parallel, which would make Raft look artificially slow. No node calls `assertLeader`, so the simulator cannot detect that Raft has finished.
- *Paxos:* the rule that a proposer must adopt the highest-numbered accepted value is not yet implemented, so the current code does not have Paxos's safety guarantee. The accept condition rejects proposals equal to the promised number, which blocks every round. Proposal numbers come from a variable shared by all nodes; real Paxos makes them unique by pairing a counter with the node identifier.
- *Framework:* timeouts are only scheduled for nodes that already know a leader, which suits Bully but means Raft and Paxos nodes never time out at start-up. The counter of messages received from the leader is never updated, so we cannot yet report message counts.

*Hypotheses to test.*
+ With low, uniform latency and well-chosen timeouts, Bully settles fastest, close to $6d$, but sends the most messages.
+ When the reply timeout is below the true latency, Bully elects multiple leaders, while Raft and Paxos slow down but never do.
+ Raft and Paxos election times are dominated by the timeout distribution, and narrower timeout ranges increase split votes and duelling proposers.
+ Variable latency increases the variance of Raft and Paxos election times more than their mean.

#include "assessment.typ"
#include "revised-plan.typ"
#include "acknowledgements.typ"

#show bibliography: it => if show_references { it } else { place(hide(it)) }
#bibliography(
  ("./refs.yml", "./refs.bib"),
  title: "References",
  style: "../lib/harvard-the-university-of-new-south-wales.csl",
)
