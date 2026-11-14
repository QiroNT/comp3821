export type LatencyGenerator<NodeMetaT> = (
  from: NetworkNode<NodeMetaT>,
  to: NetworkNode<NodeMetaT>,
) => number

export interface NetworkNeighbor<NodeMetaT> {
  node: NetworkNode<NodeMetaT>
  latency: LatencyGenerator<NodeMetaT>
}

export interface NetworkNode<NodeMetaT> {
  meta: NodeMetaT
  neighbors: Set<NetworkNeighbor<NodeMetaT>>
}

export class Network<NodeMetaT> {
  public nodes: NetworkNode<NodeMetaT>[] = []
  constructor() { }

  addNode(meta: NodeMetaT): NetworkNode<NodeMetaT> {
    const node = {
      meta,
      neighbors: new Set(),
    } satisfies NetworkNode<NodeMetaT>

    this.nodes.push(node)
    return node
  }

  connectNodes(
    a: NetworkNode<NodeMetaT>,
    b: NetworkNode<NodeMetaT>,
    latency: LatencyGenerator<NodeMetaT>,
  ) {
    a.neighbors.add({
      node: b,
      latency,
    })
    b.neighbors.add({
      node: a,
      latency,
    })
  }

  fullyConnect(latency: LatencyGenerator<NodeMetaT>) {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        this.connectNodes(this.nodes[i], this.nodes[j], latency)
      }
    }
  }

  connectRing(latency: LatencyGenerator<NodeMetaT>) {
    for (let i = 0; i < this.nodes.length; i++) {
      const next = (i + 1) % this.nodes.length
      this.connectNodes(this.nodes[i], this.nodes[next], latency)
    }
  }
}
