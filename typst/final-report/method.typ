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
Finally, TODO: explain 95%/5% latency.

*TODO:* write a proper procedure
