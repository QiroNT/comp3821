= Conclusion
Under a simulated network with discrete time intervals and reliable channels, the Raft and Paxos algorithms perform the best.
Both Paxos and Raft show a near constant time complexity in all tested scenarios.
However, Raft performs much better than Paxos at higher network sizes and uniform networks due to better handling of collisions.
If we were to make a game that implemented a leader election algorithm for ad-hoc network connection, we would choose the Raft algorithm as it is simpler to implement and such networks usually have a uniform, low-latency profile.
Additionally, as a consensus algorithm, the raft algorithm conforms better to the Host-Client paradigm presented by most games.
For large network sizes that occur for real-world distributed systems, we suggest the Paxos algorithm over the Raft and Bully algorithms as it performs marginally better than Raft on geographic latency profiles.
Therefore we conclude that the Paxos algorithm is best varied network latency profiles whilst the Raft algorithm is best in guaranteed uniform latencies.
