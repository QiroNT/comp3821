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

It is important to note that the assumption of synchronicity for Bully means that the algorithm will be more sensitive to latency changes than the other algorithms being investigated. However, due to partial synchrony being assumed in place of true synchronicity, we guarantee that this impact is minimised as the other algorithms must still communicate over the network.

*Predicted Runtime.* We will consider a fully connected network containing $n$ nodes where all connections have fixed latency $d$.
In the best case, if every node begins an election at once, the highest ID node will call three round-trip requests (`Halt`, `NewCoordinator`, and `Ready`) causing the leader to be decided after $6d$.
Furthermore, every node sends `AreYouThere` to all higher ID nodes during the election, creating $1+2+ ... +n=(n(n+1)) / 2$ requests, plus an additional $3(n-1)$ requests from the winner, all of which include with a reply.
The message complexity is therefore $Theta(n^2)$.
Under the full synchronicity model, this means that Bully is required to wait for $Theta(n^2)$ messages before the full election cycle can truly complete, therefore the expected runtime will be quadratic, especially if lower ID nodes perform the `AreYouThere` call earlier. This means the $6d$ runtime is a best case scenario where the highest node begins the election.

== Raft

The Raft Algorithms @ongaro-raft is a log-replicating consensus algorithm that acts using variable-length numbered terms which increment every time a new election is called.
Every node, other than the leader, starts as a follower, which constantly receives heartbeat updates from the leader.
Each time this happens, the follower resets an internal timer called the election timeout, which is a randomised number typically on the scale of a few hundred milliseconds.
When a follower recieves no heartbeat from the leader within its election timeout, it becomes a candidate, increments its copy of the term, votes for itself and requests votes from all other nodes.
Each node is allowed to grant at most one vote per term and cannot change its vote once cast that term, and when voting, updates its term to that of the candidate it is voting for.
If another candidate with a higher term value stands for election, each voter updates its term and is granted a new vote in the new term.
Once a candidate receives a majorty vote, it becomes leader and immediately begins sending heartbeats.

Raft guarantees that only one node can become leader, since no two candidates in the same term can acquire a majority without pushing the other below the threshold.
Unlike Bully, this guarantee is timing-independent.
If a leader is isolated by a network partition it will step down once it sees a higher term once the partition is resolved.

We modify Raft to only use the election mechanism, and ignore the log-replication aspect for our experimentation.
Since Raft is known to be correct, we still know our implementation will be correct.
Furthermore, while Raft has additional restrictions on votes where a candidate whose log is not up to date with a voter cannot be voted for, since we
don't use the replication system, this aspect is safely ignored.

*Random Timeout.*
It is possible that several followers time out at around the same time, causing votes to be split between multiple candidates.
In this case, no candidate wins, and a new term is eventually started by a voter.
However, to prevent livelock, Raft chooses timeouts randomly.
The original paper's experiments show a small range between $150$ to $300$ ms greatly reduces split votes.
This, however, requires latency between nodes to be lower than the timeout duration, as being greater could lead nodes to fail to see the leader after a successful election.

*Predicted Runtime.*
Consider a fully connected network with $n$ nodes, where each connection has latency $d$.
In the best case, the vote does not split and the candidate only needs one round trip to request and gather votes, followed by another request for followers to learn the leader.
Therefore, after the initial timeout, the election should settle after $3d$, using $O(n)$ messages.
However, as $n$ increases, the risk that another node times out close to the first and splits the vote also increases.
Therefore, we expect that Raft will have a higher variance of results especially as $n$ grows to larger numbers

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
    [Intended Problem], [Leader election], [Consensus on a log], [Consensus on one value],
    [Timing Assumption], [Synchronous], [Partial synchrony], [Partial synchrony],
    [Decided By], [Highest identifier], [Majority vote], [Majority vote],
    [Two leaders possible?], [Yes with too high latency], [No], [No],
    [Message Complexity], [$Theta(n^2)$ from start], [$O(n)$ per term], [$O(n)$ per round],
    [Predicted Runtime after Timeout], [$>= 6d$], [$>= 3d$], [$>= 5d$],
  ),
  caption: [Summary of the three algorithms for $n$ fully connected nodes with one-way latency $d$.],
) <tab-comparison>
