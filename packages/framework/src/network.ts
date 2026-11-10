export type LatencyGenerator = (from: NetworkNode, to: NetworkNode) => number

export interface NetworkNeighbor {
  node: NetworkNode
  latency: LatencyGenerator
}

export interface NetworkNode {
  neighbors: Set<NetworkNeighbor>
}

export class Network {
  public nodes: NetworkNode[] = []
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
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        this.connectNodes(this.nodes[i], this.nodes[j], latency)
      }
    }
  }

  connectRing(latency: LatencyGenerator) {
    for (let i = 0; i < this.nodes.length; i++) {
      const next = (i + 1) % this.nodes.length
      this.connectNodes(this.nodes[i], this.nodes[next], latency)
    }
  }
}
