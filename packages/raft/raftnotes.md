# Notes about the raft algorithm
It is a consensus algorithm. This can easily be turned into a leader election algorithm.
Three states for each 
- Canditate
    - nodes transition to this state when they don't hear from their leader
    - candidates request votes from other nodes.
        - send a `requestVote`
        - receiving nodes vote for this candidate if they haven't voted this term.
        - receiving node resets its election timeout.
- Follower
    - every node starts with this state.
- Leader
    - if a candidate receives majority vote, it becomes the leader.
    - sends `AppendEntries` when it is elected.
        - sent at intervals specified by heartbeat timeouts.

**Timeout settings**
- election timeout: randomised within a range (usually 150ms to 300ms).
    - on timeout the follower becomes a candidate
    - they start a new election term.
    - they vote for themselves.
