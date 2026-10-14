#import "../lib/template.typ": pc

= Code

== Framework Description

=== The local state (`this`)

Each node has a permanent local state `this`. The algorithms are free to read/write whatever they want in the local
state.

Some parts of the local state are maintained by the framework itself. They are as follows.

- `this.id` contains an integer ID that is unique across all nodes in the network.
- `this.network` is an array of all the other nodes in the network, alive or not. The list stays constant for the
  duration of the election.
- `this.abortOutstanding` is a function that when called, cancels all other functions on the node currently waiting on
  an `await` point.

=== The node interface

The set of `node`s contained in `this.network` are provided with these functions.

- `node.id` is the node's ID.
- `node.call(name, ...parameters)`, which sends an RPC to the node when called.

  The function is asynchronous, and returns an object containing `status` and `response`.

  When the `status` is `'timeout'`, the RPC call has timed out and no reply has been received. Otherwise, the `response`
  contains the message sent by `reply()`.

=== Remote procedure calls (`@rpc`)

`@rpc` marks a function as a remote procedure call. The RPC can be invoke by other nodes via `node.call()`.

The first parameter received is the RPC context, which contains the following fields.

- `sender` is the node interface of the sender. It is guaranteed to be an element of `this.network`.
- `reply(message)`, which sends a reply back to the callee when called. This function is also asynchronous, and returns
  an object containing `status`.

The rest of the parameters are the parameters passed in `node.call()`.

== Bully

The bully algorithm presented by #pc[@garcia-bully] is transcribed as follows.

```js
/**
 * This procedure is used by remote nodes to discover if the node is operating.
 * Nothing is actually done at the node.
 */
@rpc
async function areYouThere({ reply }) {
    await reply()
}

/**
 * This procedure is called by coordinators to discover the state of a node.
 */
@rpc
async function areYouNormal({ reply }) {
    if (this.state == 'normal') {
        await reply(true)
    } else {
        await reply(true)
    }
}

/**
 * When a node receives this message, it means that the sender node is trying
 * to become coordinator.
 */
@rpc
function halt({ sender }) {
    this.state = 'election'
    this.haltedBy = sender
    this.abortOutstanding()
}

/**
 * The sender node uses this procedure to inform the receiver node that the
 * sender has become coordinator.
 */
@rpc
function newCoordinator({ sender }) {
    if (this.haltedBy == sender && this.state == 'election') {
        this.coordinator = sender
        this.state = 'reorganization'
    }
}

/**
 * Coordinator uses this procedure to distribute the new task description.
 */
@rpc
function ready({ sender }, description) {
    if (this.coordinator == sender && this.state == 'reorganization') {
        this.description = description
        this.state = 'normal'
    }
}

/**
 * By executing this procedure, the node attempts to become coordinator.
 */
async function election() {
    // First step is to check if any higher priority nodes are up. If any such
    // node is up, quit.
    for (const node of this.network.filter(node => node.id > this.id)) {
        const { status } = await node.call(areYouThere)
        if (status == 'timeout') {
            continue
        } else {
            return
        }
    }

    // Next, halt all lower priority nodes, starting with this node.
    this.abortOutstanding()
    this.state = 'election'
    this.haltedBy = this
    const up = []
    for (const node of this.network.filter(node => node.id < this.id)) {
        const { status } = await node.call(halt)
        if (status == 'timeout') {
            continue
        } else {
            up.push(node)
        }
    }

    // Now the node has reached its "election point." Next step is to inform
    // nodes of new coordinator.
    this.coordinator = this
    this.state = 'reorganization'
    for (const node of up) {
        const { status } = await node.call(newCoordinator)
        if (status == 'timeout') {
            // The node failed. The simplest thing is to restart.
            await election()
            return
        }
    }

    // The reorganization of the system occurs here. When done, the node has
    // computed `this.description`, the new task description.
    // (`this.description` probably contains a copy of `up`.) If during the
    // reorganization a node in `up` fails, the reorganization can be stopped
    // and a new reorganization started.
    for (const node of up) {
        const { status } = await node.call(ready, this.description)
        if (status == 'timeout') {
            await election()
            return
        }
    }

    this.state = 'normal'
}

/**
 * This procedure is automatically called by the operating system when a node
 * starts up after a failure.
 */
async function recovery() {
    delete this.haltedBy
    await election()
}

/**
 * This procedure is called periodically by the operating system.
 */
async function check() {
    if (this.state == 'normal' && this.coordinator == i) {
        // I am coordinator. Check if everyone else is normal.
        for (const node of this.network) {
            const { status, response } = await node.call(areYouNormal)
            if (status == 'timeout') {
                continue
            }
            if (response == false) {
                await election()
                return
            }
        }
    }
}

/**
 * This procedure is called automatically when the node has not heard from the
 * coordinator in a "long" time.
 */
async function timeout() {
    if (this.state == 'normal' || this.state == 'reorganization') {
        // Check if coordinator is up.
        const { status } = await this.coordinator.call(areYouThere)
        if (status == 'timeout') {
            await election()
        }
    } else {
        await election()
    }
}
```

// IMMEDIATE PROCEDURE AreYouThere(i);
//   BEGIN
//     ⟨⟨This procedure is used by remote nodes to discover if node i is operating. Nothing is actually done at node i.⟩⟩
//   END AreYouThere;

// IMMEDIATE PROCEDURE AreYouNormal(i, answer);
//   BEGIN
//     ⟨⟨This procedure is called by coordinators to discover the state of a node.⟩⟩
//     [[IF S(i) · s = "Normal" THEN answer := "Yes"
//       ELSE answer := "No";]]
//   END AreYouNormal;

// IMMEDIATE PROCEDURE Halt(i, j);
//   BEGIN
//     ⟨⟨When node i receives this message, it means that node j is trying to become coordinator.⟩⟩
//     [[S(i) · s := "Election"; S(i) · h := j;
//       CALL STOP;]]
//   END Halt;

// IMMEDIATE PROCEDURE NewCoordinator(i, j)
//   BEGIN
//     ⟨⟨Node j uses this procedure to inform node i that node j has become coordinator.⟩⟩
//     [[IF S(i) · h = j AND S(i) · s = "Election" THEN
//         BEGIN
//           S(i) · c := j; S(i) · s := "Reorganization";
//         END;]]
//   END NewCoordinator;

// IMMEDIATE PROCEDURE Ready(i, j, x);
//   BEGIN
//     ⟨⟨Coordinator j uses this procedure to distribute the new task description x.⟩⟩
//     [[IF S(i) · c = j AND S(i) · s = "Reorganization" THEN
//         BEGIN
//           S(i) · d := x; S(i) · s := "Normal";
//         END;]]
//   END Ready;

// PROCEDURE Election(i);
//   BEGIN
//     ⟨⟨By executing this procedure, node i attempts to become coordinator. First step is to check if any higher priority nodes are up. If any such node is up, quit.⟩⟩
//     FOR j := i + 1, i + 2, ···, n - 1, n DO
//       BEGIN ⟨⟨n is number of nodes in system.⟩⟩
//         CALL AreYouThere(j), ONTIMEOUT(T):
//           NEXT ITERATION;
//         RETURN;
//       END;
//     ⟨⟨Next, halt all lower priority nodes, starting with this node.⟩⟩
//     [[CALL STOP;
//       S(i) · s := "Election"; S(i) · h := i; S(i) · Up := { };]]
//     FOR j := i - 1, i - 2, ···, 2, 1 DO
//       BEGIN
//         CALL Halt(j, i), ONTIMEOUT(T): NEXT ITERATION;
//         [[S(i) · Up := {j} UNION S(i) · Up;]]
//       END;
//     ⟨⟨Now node i has reached its "election point." Next step is to inform nodes of new coordinator.⟩⟩
//     [[S(i) · c := i; S(i) · s := "Reorganization";]]
//     FOR j IN S(i) · Up DO
//       BEGIN
//         CALL NewCoordinator(j, i), ONTIMEOUT(T):
//           BEGIN
//             CALL Election(i); RETURN;
//             ⟨⟨Node j failed. The simplest thing is to restart.⟩⟩
//           END;
//       END;
//     ⟨⟨The reorganization of the system occurs here. When done, node i has computed S(i) · d, the new task description. (S(i) · d probably contains a copy of S(i) · Up.) If during the reorganization a node in S(i) · Up fails, the reorganization can be stopped and a new reorganization started.⟩⟩
//     FOR j IN S(i) · Up DO
//       BEGIN
//         CALL Ready(j, i, S(i) · d), ONTIMEOUT(T):
//           BEGIN
//             CALL Election(i); RETURN;
//           END;
//       END;
//     [[S(i) · s := "Normal";]]
//   END Election;

// PROCEDURE Recovery(i);
//   BEGIN
//     ⟨⟨This procedure is automatically called by the operating system when a node starts up after a failure.⟩⟩
//     S(i) · h := UNDEFINED; ⟨⟨e.g., set it to -1⟩⟩
//     CALL Election(i);
//   END Recovery;

// PROCEDURE Check(i);
//   BEGIN
//     ⟨⟨This procedure is called periodically by the operating system.⟩⟩
//     IF [[S(i) · s = "Normal" AND S(i) · c = i]] THEN
//       BEGIN ⟨⟨I am coordinator. Check if everyone else is normal.⟩⟩
//         FOR j := 1, 2, ···, i - 1, i + 1, ···, n DO
//           BEGIN
//             CALL AreYouNormal(j, ans), ONTIMEOUT(T):
//               NEXT ITERATION;
//             IF ans = "No" THEN
//               BEGIN CALL Election(i); RETURN; END;
//           END;
//       END;
//   END Check;

// PROCEDURE Timeout(i);
//   BEGIN
//     ⟨⟨This procedure is called automatically when node i has not heard from the coordinator in a "long" time.⟩⟩
//     IF [[S(i) · s = "Normal" OR S(i) · s "Reorganization"]]
//       THEN
//         BEGIN
//           ⟨⟨Check if coordinator is up.⟩⟩
//           CALL AreYouThere(S(i) · c), ONTIMEOUT(T):
//             CALL Election(i);
//         END
//     ELSE CALL Election(i);
//   END Timeout;

// It describes the Invitation algorithm as follows.

// PROCEDURE Check(i);
//   BEGIN
//     ⟨⟨This procedure is called periodically by the operating system.⟩⟩
//     IF [[S(i) · s = "Normal" AND S(i) · c = i]] THEN
//       BEGIN ⟨⟨See if other groups exist for possible merge.⟩⟩
//         TempSet := { }; ⟨⟨i.e., the empty set⟩⟩
//         FOR j := 1, 2, ···, i - 1, i + 1, ···, n DO
//           BEGIN ⟨⟨n is the number of nodes in the system⟩⟩
//             CALL AreYouCoordinator(j, ans), ONTIMEOUT(T):
//               NEXT ITERATION;
//             IF ans = "Yes" then TempSet := TempSet UNION
//               {j};
//           END;
//         IF TempSet = { } THEN RETURN;
//         p := MAXIMUM(TempSet);
//         IF i < p THEN "wait time proportional to p - i";
//         ⟨⟨The above statement gives the node with highest priority a chance to organize a merge first. This wait time should be large as compared to the time between calls to procedure Check.⟩⟩
//         CALL Merge(i, TempSet);
//       END;
//   END Check;

// PROCEDURE Timeout(i);
//   BEGIN
//     ⟨⟨This procedure is called when node i has not heard from its coordinator in some time.⟩⟩
//     [[MyCoord := S(i) · c; MyGroup := S(i) · g]]
//     IF MyCoord = i THEN RETURN
//     ELSE
//       BEGIN
//         CALL AreYouThere(MyCoord, MyGroup, i, ans),
//           ONTIMEOUT(T): CALL Recovery(i);
//         IF ans = "No" THEN CALL Recovery(i);
//       END;
//   END Timeout;

// PROCEDURE Merge(i, CoordinatorSet);
//   BEGIN
//     ⟨⟨This procedure will form a new group with node i as coordinator and will invite coordinators in CoordinatorSet to join in.⟩⟩
//     [[S(i) · s := "Election";
//       ⟨⟨Above statement will prevent node i from accepting invitations while this procedure is executed.⟩⟩
//       CALL STOP;
//       S(i) · counter := S(i) · counter + 1;
//       S(i) · g := i CONCATENATED S(i) · counter;
//       S(i) · c := i; TempSet := S(i) · Up; S(i) · Up := { };]]
//     FOR j IN CoordinatorSet DO
//       CALL Invitation(j, i, S(i) · g), ONTIMEOUT(T):
//         NEXT ITERATION;
//     FOR j IN TempSet DO
//       CALL Invitation(j, i, S(i) · g), ONTIMEOUT(T):
//         NEXT ITERATION;
//     "Wait a reasonable time for accept messages to come in"
//     [[S(i) · s := "Reorganization";]]
//     ⟨⟨The reorganization of the group with members S(i) · Up occurs here. When done, node i has computed S(i) · d, the new task description (which probably includes a copy of S(i) · Up). If during the reorganization a node in S(i) · Up does not respond, the reorganization can be stopped and a new reorganization attempted.⟩⟩
//     FOR j IN S(i) · Up DO
//       CALL Ready(j, i, S(i) · g, S(i) · d), ONTIMEOUT(T):
//         CALL Recovery(i);
//     [[S(i) · s := "Normal";]]
//   END Merge;

// PROCEDURE Ready(i, j, gn, x);
//   BEGIN
//     ⟨⟨Coordinator j of group gn is giving node i the new task description x.⟩⟩
//     [[IF S(i) · s = "Reorganization" AND S(i) · g = gn
//       THEN
//         BEGIN
//           S(i) · d := x; S(i) · s := "Normal";
//         END;]]
//   END Ready;

// PROCEDURE AreYouCoordinator(i, ans);
//   BEGIN
//     ⟨⟨The calling node wishes to know if node i is a coordinator in normal state, so that it can be invited to join a new group.⟩⟩
//     [[IF S(i) · s = "Normal" AND S(i) · c = i THEN ans :=
//       "Yes"
//       ELSE ans := "No";]]
//   END AreYouCoordinator;

// PROCEDURE AreYouThere(i, gn, j, ans);
//   BEGIN
//     ⟨⟨Node j wishes to find out if node i is the coordinator of group gn and considers node j a member of the group.⟩⟩
//     [[IF S(i) · g = gn AND S(i) · c = i AND j ∈ S(i) · Up THEN
//         ans := "Yes"
//       ELSE ans := "No";]]
//   END AreYouThere;

// PROCEDURE Invitation(i, j, gn);
//   BEGIN
//     ⟨⟨Node j invites node i to join group gn.⟩⟩
//     [[IF S(i) · s ≠ "Normal" THEN RETURN; ⟨⟨decline
//       invitation⟩⟩
//       CALL STOP; Temp := S(i) · c; TempSet := S(i) · Up;
//       S(i) · s := "Election"; S(i) · c := j; S(i) · g := gn;]]
//     IF Temp = i THEN ⟨⟨forward invitation to my old members⟩⟩
//       FOR k IN TempSet DO
//         CALL Invitation(k, j, gn), ONTIMEOUT(T):
//           NEXT ITERATION;
//     CALL Accept(j, i, gn), ONTIMEOUT(T):
//       CALL Recovery(i);
//     [[S(i) · s := "Reorganization";]]
//   END Invitation;

// PROCEDURE Accept(i, j, gn);
//   BEGIN
//     ⟨⟨Node j has accepted the invitation of node i to join group gn.⟩⟩
//     [[IF S(i) · s = "Election" AND S(i) · g = gn AND S(i) · c
//       = i THEN
//         S(i) · Up := S(i) · Up UNION {j};]]
//   END Accept;

// PROCEDURE Recovery(i);
//   BEGIN
//     ⟨⟨Node i is recovering from a failure.⟩⟩
//     [[S(i) · s := "Election"; CALL STOP;
//       S(i) · counter := S(i) · counter + 1;
//       S(i) · g := i CONCATENATED S(i) · counter;
//       S(i) · c := i; S(i) · Up := { };
//       S(i) · s := "Reorganization";
//       ⟨⟨A single node task description is computed and placed in S(i) · d.⟩⟩
//       S(i) · s := "Normal";]]
//   END Recovery;
