import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  type Simulation,
} from "d3-force";
import type { Node, Link } from "./store";

let simulation: Simulation<Node, Link> | null = null;

export function initializeSimulation(
  nodes: Node[],
  links: Link[],
  onTick: () => void
) {
  simulation = forceSimulation(nodes)
    .force(
      "link",
      forceLink<Node, Link>(links)
        .id((d) => d.id)
        .distance(150)
        .strength(0.1)
    )
    .force("charge", forceManyBody().strength(-400))
    .force("center", forceCenter(window.innerWidth / 2, window.innerHeight / 2))
    .on("tick", onTick);
}

export function updateSimulationNodes(nodes: Node[]) {
  if (!simulation) return;

  console.log("updateSimulationNodes", nodes);
  simulation.nodes(nodes);
  simulation.alpha(0.3).restart();
}

export function stopSimulation() {
  simulation?.stop();
  simulation = null;
}

export function startDragNode(nodeId: string) {
  if (!simulation) return;
  simulation.alphaTarget(0.3).restart();
  const node = simulation.nodes().find((n) => n.id === nodeId);
  if (node) {
    node.fx = node.x;
    node.fy = node.y;
  }
  console.log("startDragNode", node?.fx, node?.fy);
}

export function dragNode(nodeId: string, x: number, y: number) {
  if (!simulation) return;
  const node = simulation.nodes().find((n) => n.id === nodeId);
  if (node) {
    node.fx = x;
    node.fy = y;
  }
  // if (node?.id.startsWith("node"))
  // console.log("dragNode", node?.fx, node?.fy);
}

export function endDragNode(nodeId: string) {
  if (!simulation) return;
  simulation.alphaTarget(0);
  const node = simulation.nodes().find((n) => n.id === nodeId);
  console.log("endDragNode", node?.fx, node?.fy);
  if (node) {
    node.fx = null;
    node.fy = null;
  }

}
