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

For all profiles and networks, a symmetric bi-directional link latency was assumed. 
This means that for any link between two nodes, A and B, the latency from A to B would be the same as the latency from B to A.

=== Randomness
Many of the algorithms and experiment rely on randomisation.
For example, the random backoff for the Raft algorithm as well as the random distribution of latencies across a network.
To ensure that randomness did't skew the results, hundreds of samples were done to standardise our distribution.

=== Timing
The testing framework provides a system of discrete time steps based on the latency of network links.
This meant that results were not affected by any variance in the optimisation of algorithm implementation, compute speed of physical hardware and the transmission delays caused by pushing data onto a link.
For in-depth analysis, the framework provided logs for each message sent.

=== Procedure
The following steps were automated using Python3:
+ Set the algorithm code for the simulation to be the Bully algorithm
+ Build a connected network of size 20
+ Set each edge to have the same latency
+ Start the simulation and record the finishing time for the logs
+ Repeat the above 5 move times
+ Repeat the above for all other latency profiles
+ Repeat the above for all other network sizes [TODO: write the actual discrete size]
+ Repeat the above for the Paxos and Raft algorithm