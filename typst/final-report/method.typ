= Method
We tested 3 algorithms with varied network sizes and various network latency profiles.
Specifically, we tested all possible combinations of algorithms (Bully, Paxos, Raft), network sizes (20, TODO: the actual discrete sizes) and latency profiles (TODO: the actual discrete profiles).

=== Latency Profiles
"Network latency profiles" describe the distribution and (non-statistical) variance of the latency between links in a network.
The network latency profiles we tested were uniform, geographic and randomly distributed ratios.
Uniform network latency was simulated by setting the same latency for all links in our network.
The geographic network latency profile mimics latency profiles that exist in the real world. 
For example, between Australia and South Korea, there might be a couple hundred milliseconds of delay whilst within Australia itself, network latencies may only be tens of milliseconds.
Thus these profiles help evaluate the real-world effectiveness of algorithms on distributed systems.
Finally, we tested on a 95%/5% split of fast and slow links, with the slow links being 100 times slower than the fast ones. These varied speeds were then randomly distributed across the network.

=== Randomness
Many of the algorithms and experiment rely on randomisation.
For example, the random backoff for the Raft algorithm as well as the random distribution of latencies across a network.
To ensure that randomness doesn't skew our results we did hundreds of samples to standardise our distribution.

=== Procedure
We automated the following steps using Python3:
+ Set the algorithm code for the simulation to be the Bully algorithm
+ Build a connected network of size 20
+ Set each edge to have the same latency
+ Start the simulation and record the finishing time fro the logs
+ Repeat the above 5 move times
+ Repeat the above for all other latency profiles
+ Repeat the above for all other network sizes [TODO: write the actual discrete size]
+ Repeat the above for the Paxos and Raft algorithms