export type LatencyGenerator = (a: NetworkNode, b: NetworkNode) => number

export interface NetworkNeighbor {
  node: NetworkNode
  latency: LatencyGenerator
}

export interface NetworkNode {
  neighbors: Set<NetworkNeighbor>
}

export class Network {
  private nodes: NetworkNode[] = []
  constructor() { }

  addNode(): NetworkNode {
    const node = {
      neighbors: new Set(),
    } satisfies NetworkNode

    this.nodes.push(node)
    return node
  }

  connectNodes(a: NetworkNode, b: NetworkNode, latency: LatencyGenerator) {
    a.neighbors.add({
      node: b,
      latency,
    })
    b.neighbors.add({
      node: a,
      latency,
    })
  }

  fullyConnect(latency: LatencyGenerator) {
    for (const a of this.nodes) {
      for (const b of this.nodes)
        this.connectNodes(a, b, latency)
    }
  }
}
