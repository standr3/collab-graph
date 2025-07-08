import { create } from "zustand";
import { type SimulationNodeDatum, type SimulationLinkDatum } from "d3-force";

export interface NodeData {
  id: string;
  label: string;
}

export interface LinkData {
  id: string;
  source: string;
  target: string;
}

export interface Node extends SimulationNodeDatum, NodeData {
  width: number;
  height: number;
}

export interface Link extends SimulationLinkDatum<Node> {
  id: string;
}

interface GraphState {
  nodes: Node[];
  links: Link[];
  initializeGraph: (nodes: NodeData[], links: LinkData[]) => void;
  addNode: (newNode: NodeData) => void;
  updateNodePositions: (updatedNodes: { id: string; x: number; y: number }[]) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  links: [],

  initializeGraph: (initialNodes, initialLinks) => {
    const nodes: Node[] = initialNodes.map(node => {
      return { ...node, width: 150, height: 50 };
    });

    const links: Link[] = initialLinks.map(link => ({
      id: link.id,
      source: link.source,
      target: link.target,
    }));

    set({ nodes, links });
  },

  addNode: (newNodeData) => {
    set(state => {
      const newNode: Node = {
        ...newNodeData,
        width: 150,
        height: 50,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
      return { nodes: [...state.nodes, newNode] };
    });
  },

  updateNodePositions: (updatedNodes) => {
    set(state => ({
      nodes: state.nodes.map(node => {
        const updated = updatedNodes.find(un => un.id === node.id);
        if (updated) {
          return { ...node, x: updated.x, y: updated.y };
        }
        return node;
      })
    }));
  }
}));
