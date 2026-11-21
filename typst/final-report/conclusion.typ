= Conclusion
// TODO: WRITE AN ACTUAL CONCULSION!!!
Under a simulated network with discrete time intervals and reliable channels, Paxos is the fastest algorithm.
Both Paxos and Raft show an empirical linear time complexity with Raft having a lightly larger overhead. 
If we were to make a game that implemented a leader election algorithm for multi-user connection, we would choose the Raft algorithm as it is simpler to implement and is bounded in worst-case time complexity.
Additionally, as a consensus algorithm, the raft algorithm conforms better to the Host-Client paradigm presented by most games.
Therefore we conclude that the Raft and Paxos algorithms are best for real world applications whilst the Bully algorithm is best left for theoretical analysis.

*TODO:* conluding thoughts. a summary of findings.
