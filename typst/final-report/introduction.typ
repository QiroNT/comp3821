= Introduction
// TODO: do we keep any of this?
// Which leader election algorithm resolves the fastest? Do uniform or varied network speeds affect these algorithms? On
// what topologies are different algorithms superior? How does real world testing compare? We attempt address these
// questions through experimental testing on specific algorithms.

// Leader election algorithms refer to a set of algorithms in distributed computing that aim to choose a unique leader in a
// peer to peer network, where there is no pre-established leader. Nodes in the network are limited to sending messages to
// neighboring connected nodes, and are only aware of their neighbors at the start.

A distributed system is a collection of nodes (independent computers) that coordinate by passing messages over a network. Many such systems rely on a leader node to distribute work and act as a source of truth. If the leader fails the remaining nodes will need to elect a new one, and the speed of this election directly affects availability. This also applies to small ad-hoc gaming networks where losing the host should not end the session. Hence, we empirically compare the speed of the Bully, Paxos and Raft leader election algorithms on a complete network under a variety of latency profiles.

== Communication Model

Leader election is often studied in networks where nodes can only message their neighbours, which suits algorithms designed for rings or general graphs.
However, in the real-world, much is abstracted aware by low-level (in the OSI sense) hardware, such as routers or switches, and also protocols like DNS, such that nodes like servers or databases functionally view the internet a complete graph.
To mirror this, three algorithms we compare instead assume that any node can message any other directly, and our simulated network topology reflects this by allowing all nodes in the network to communicate with all others.
Network topology in our experiments is therefore modelled as a complete graph with bi-directional links between pairs of nodes.

// Outline procedure

== Predictions
// TODO: ?? what is the analysis above ?? -> could it be the background?
The based on theoretical analysis performed by others (see @background) we form the following hypotheses, which our experiments test.

+ With low, uniform latency and well-chosen timeouts, Bully settles fastest, close to $6d$, but sends the most messages.
+ When the reply timeout is below the true latency, Bully elects multiple leaders, while Raft and Paxos slow down but never do.
+ Raft and Paxos election times are dominated by the timeout distribution, and narrower timeout ranges increase split votes and duelling proposers.
+ Variable latency increases the variance of Raft and Paxos election times more than their mean.