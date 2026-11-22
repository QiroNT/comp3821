= Discussion
The Bully algorithm does settle the fastest out of all algorithms under specific circumstances.
From @fig:avg-single, the Bully algorithm only settles the fastest under uniform network conditions.
In all other cases, the Bully algorithm performs worse and has a worse asymptotic trend.
We do not suggest the bully algorithm for any real world use due it its significantly worse performance.

On average, both the Raft and Paxos algorithms perform better at around intervals.
For geographic latency profiles it is around $10^3$ms whilst for the more uniform profiles, this is around $10^1.5$ms.
The difference between the profiles is most likely due to simulation input difference.
However, the trend still rains that Paxos and Raft remain at around constant election times.
This is caused by their partial synchrony model which only slows down their election rates when large number of collisions happen.
As seen in @fig:avg-skewed and @fig:avg-single, the Paxos algorithm suddenly spikes due to a large number of collisions occurring.
The manner in which it does so, leaves the Raft algorithm as more favourable on uniform networks as the Raft algorithm only experiences a minor increase in election time in @fig:avg-skewed.

On the other hand, the Paxos algorithm performs marginally faster than the Raft algorithm in geographic latencies.
This is most likely due to the Raft algorithm experiencing higher number of collisions across regions.
When this occurs, clusters of nodes on either side of a high latency link may vote within their respective low latency clusters easily creating a split vote.
As a result the Raft algorithm could more easily encounter collisions and increase its election time.
The Paxos algorithm handles such cases better with its liveness characteristic.
Thus we suggest that the Paxos algorithm is more suitable for applications spanning large regions, such as from APAC to EU.