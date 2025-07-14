import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  type Simulation,
  type ForceCenter,
  type ForceLink,
} from "d3-force";
import type { Node, Link } from "./store";
import {
  LINK_DISTANCE,
  CHARGE_STRENGTH,
  CENTER_STRENGTH,
  SIMULATION_ALPHA,
  DRAG_ALPHA_TARGET,
} from "./config";

let simulation: Simulation<Node, Link> | null = null;

export function initializeSimulation(
  getNodes: () => Node[],
  getLinks: () => Link[],
  onTick: () => void,
  width: number,
  height: number
) {
  const nodes = getNodes();
  const links = getLinks();

  simulation = forceSimulation(nodes)
    .force(
      "link",
      forceLink<Node, Link>(links)
        .id((d) => d.id)
        .distance(LINK_DISTANCE)
        .strength(CENTER_STRENGTH)
    )
    .force("charge", forceManyBody().strength(CHARGE_STRENGTH))
    .force("center", forceCenter(width / 2, height / 2).strength(CENTER_STRENGTH))
    .on("tick", onTick);
}

export function updateSimulationCenter(width: number, height: number) {
  if (!simulation) return;
  const centerForce = simulation.force<ForceCenter<Node>>("center");
  if (centerForce) {
    centerForce.x(width / 2);
    centerForce.y(height / 2);
    simulation.alpha(SIMULATION_ALPHA).restart();
  }
}

export function updateSimulationNodes(nodes: Node[]) {
  if (!simulation) return;

  const oldNodes = simulation.nodes();
  const nodeMap = new Map(oldNodes.map((n) => [n.id, n]));

  nodes.forEach((newNode) => {
    const oldNode = nodeMap.get(newNode.id);
    if (oldNode) {
      // Preserve properties from the old simulation node
      newNode.x = oldNode.x;
      newNode.y = oldNode.y;
      newNode.vx = oldNode.vx;
      newNode.vy = oldNode.vy;
      newNode.fx = oldNode.fx;
      newNode.fy = oldNode.fy;
    }
  });

  simulation.nodes(nodes);
  simulation.alpha(SIMULATION_ALPHA).restart();
}

export function updateSimulationLinks(links: Link[]) {
  if (!simulation) return;
  const linkForce = simulation.force<ForceLink<Node, Link>>("link");
  if (linkForce) {
    linkForce.links(links);
    simulation.alpha(SIMULATION_ALPHA).restart();
  }
}

export function stopSimulation() {
  simulation?.stop();
  simulation = null;
}

export function startDragNode(nodeId: string) {
  if (!simulation) return;
  simulation.alphaTarget(DRAG_ALPHA_TARGET).restart();
  freezeNode(nodeId);
}

export function dragNode(nodeId: string, x: number, y: number) {
  if (!simulation) return;
  const node = simulation.nodes().find((n) => n.id === nodeId);
  if (node) {
    node.fx = x;
    node.fy = y;
  }
}

export function endDragNode(nodeId: string, unfreeze = true) {
  if (!simulation) return;
  simulation.alphaTarget(0);

  if (unfreeze) {
    unfreezeNode(nodeId);
  }
}

export function freezeNode(nodeId: string) {
  if (!simulation) return;
  const node = simulation.nodes().find((n) => n.id === nodeId);
  if (node) {
    node.fx = node.x;
    node.fy = node.y;
  }
}

export function unfreezeNode(nodeId: string) {
  if (!simulation) return;
  const node = simulation.nodes().find((n) => n.id === nodeId);
  if (node) {
    node.fx = null;
    node.fy = null;
  }
}

export function getSimulationNodes(): readonly Node[] {
  return simulation?.nodes() ?? [];
}
