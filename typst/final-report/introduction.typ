= Introduction
// TODO: do we keep any of this?
// Which leader election algorithm resolves the fastest? Do uniform or varied network speeds affect these algorithms? On
// what topologies are different algorithms superior? How does real world testing compare? We attempt address these
// questions through experimental testing on specific algorithms.

// Leader election algorithms refer to a set of algorithms in distributed computing that aim to choose a unique leader in a
// peer to peer network, where there is no pre-established leader. Nodes in the network are limited to sending messages to
// neighboring connected nodes, and are only aware of their neighbors at the start.

Much of the internet is composed of distributed systems. 
Large companies like Netflix, Google, Amazon, Meta run content distribution networks (CDNs) to serve data to clients faster. 
Internally, businesses may manage a database with additional redundant databases that must be kept up to date. 
Implementations of cloud computing may choose to create an orchestrator that organises batch processes for parallel processing.
A common paradigm used to manage such systems involves selecting a leader that all nodes defer to as a source of truth or orchestrator.
The widespread nature of distributed systems and use of leader election algorithms demand an empirical evaluation of their speed both in real world scenarios and ideal networks.

Another motivation for analysing leader election algorithms is to investigate their feasibility in smaller scale networks, such as ad-hoc gaming connections.
For example, basic Minecraft local multiplayer involves setting a computer as host and all other computers join as clients.
However, if a drink were to spill on the host laptop, it may disconnect from the network and crash the game.
Implementing a leader election algorithm could allow a connected network of players to recover a game state and choose a new host with minimal disruption to their experience.
Thus as a minor motivation we wish to explore the ease of implementation and speed of various leader election algorithms in order to determine their feasibility of their inclusion in video games.

To do so, we will evaluate the speed of the Bully, Paxos and Raft leader election algorithms on a complete network and various latency profiles to evaluate which elects a leader the fastest.

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