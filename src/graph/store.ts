

/**
 * Zustand store managing the graph state, including nodes and links.
 *
 * This store provides a centralized state management solution for graph data,
 * exposing actions to initialize the graph, add nodes, and update node positions.
 *
 * Exported Hook:
 * - `useGraphStore`: React hook to access and manipulate graph state.
 *
 * State Shape:
 * - `nodes`: Array of nodes with position and size information.
 * - `links`: Array of links connecting nodes.
 *
 * Actions:
 * - `initializeGraph(nodes: NodeData[], links: LinkData[])`: Initializes the graph with
 *    provided nodes and links data. Use this to reset or set up initial graph state.
 * - `addNode(newNode: NodeData)`: Adds a new node with default size to the graph.
 * - `updateNodePositions(updatedNodes: { id: string; x: number; y: number }[])`: Updates
 *    positions of existing nodes by matching IDs.
 *
 * Note:
 * This store relies on Zustand and TypeScript types defined in this file.
 */

import { create } from "zustand";
import { type SimulationNodeDatum, type SimulationLinkDatum } from "d3-force";
import { freezeNode, unfreezeNode } from "./simulation";

export interface NodeData {
  id: string;
  label: string;
}

export interface LinkData {
  id: string;
  source: string;
  target: string;
}

/**
 * Extended node type combining D3 force simulation properties with custom node data.
 */
export interface Node extends SimulationNodeDatum, NodeData {
  width: number;
  height: number;
}

/**
 * Extended link type combining D3 force simulation properties with custom link data.
 */
export interface Link extends SimulationLinkDatum<Node> {
  id: string;
}

/**
 * Shape of the Zustand store managing graph state.
 */
interface GraphState {
  /** Array of current nodes in the graph */
  nodes: Node[];
  /** Array of current links in the graph */
  links: Link[];
  /** Context menu state */
  contextMenu: { x: number; y: number; nodeId: string } | null;
  /** ID of the node that is currently "frozen" and should not be affected by simulation forces */
  frozenNodeId: string | null;
  /**
   * Initialize the graph state with given nodes and links.
   * @param nodes - Array of basic node data to initialize the graph
   * @param links - Array of basic link data to initialize the graph
   */
  initializeGraph: (nodes: NodeData[], links: LinkData[]) => void;
  /**
   * Add a new node to the graph.
   * @param newNode - Basic node data for the node to add
   */
  addNode: (newNode: NodeData) => void;
  /**
   * Deletes a node and its connected links from the graph.
   * @param nodeId - The ID of the node to delete
   */
  deleteNode: (nodeId: string) => void;
  /**
   * Update positions (id, x, y) of existing nodes in the graph.
   * @param updatedNodes - Array containing node IDs and their new x,y coordinates
   */
  updateNodePositions: (
    updatedNodes: { id: string; x: number; y: number }[]
  ) => void;
  /**
   * Opens the context menu for a specific node.
   * @param nodeId - The ID of the node to open the menu for
   * @param x - The x-coordinate for the menu
   * @param y - The y-coordinate for the menu
   */
  openContextMenu: (nodeId: string, x: number, y: number) => void;
  /** Closes the currently open context menu. */
  closeContextMenu: () => void;
}

/**
 * Zustand store hook for managing graph nodes and links with position updates.
 */
export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  links: [],
  contextMenu: null,
  frozenNodeId: null,

  /**
   * Initializes the graph state with provided nodes and links.
   * Maps basic node and link data into full nodes and links with size properties.
   *
   * @param initialNodes - Array of basic node data (id and label)
   * @param initialLinks - Array of basic link data (id, source, target)
   */
  initializeGraph: (
    initialNodes: NodeData[],
    initialLinks: LinkData[]
  ): void => {
    const nodes: Node[] = initialNodes.map((node: NodeData) => {
      return { ...node, width: 150, height: 50 };
    });

    const links: Link[] = initialLinks.map((link: LinkData) => ({
      id: link.id,
      source: link.source,
      target: link.target,
    }));

    // Update the Zustand store with new nodes and links
    set({ nodes, links });
  },

  /**
   * Adds a new node to the current graph state.
   * Assigns default width and height; position can be set as needed.
   *
   * @param newNodeData - Basic data of the node to add (id and label)
   */
  addNode: (newNodeData: NodeData): void => {
    set((state) => {
      const newNode: Node = {
        ...newNodeData,
        width: 150,
        height: 50,
        // Positioning can be set here if needed, e.g.:
        // x: window.innerWidth / 2,
        // y: window.innerHeight / 2,
      };

      console.log("Adding new node:", newNode);
      return { nodes: [...state.nodes, newNode] };
    });
  },

  /**
   * Deletes a node and any links connected to it.
   *
   * @param nodeId - The ID of the node to be deleted
   */
  deleteNode: (nodeId: string): void => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      links: state.links.filter((link) => {
        const source = link.source as Node | string | number;
        const target = link.target as Node | string | number;
        const sourceId = typeof source === "object" ? source.id : source;
        const targetId = typeof target === "object" ? target.id : target;
        return sourceId !== nodeId && targetId !== nodeId;
      }),
    }));
  },

  /**
   * Updates the positions of existing nodes in the graph.
   * Only nodes matching provided IDs will be updated.
   *
   * @param updatedNodes - Array of objects containing node IDs and their new x,y coordinates
   */
  updateNodePositions: (
    updatedNodes: { id: string; x: number; y: number }[]
  ): void => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        const updated = updatedNodes.find((un) => un.id === node.id);
        if (updated) {
          return { ...node, x: updated.x, y: updated.y };
        }
        return node;
      }),
    }));
  },

  /**
   * Opens the context menu at a specific position for a given node.
   * Also sets the node as "frozen" to prevent it from moving.
   *
   * @param nodeId - The ID of the node to open the menu for
   * @param x - The screen x-coordinate to display the menu
   * @param y - The screen y-coordinate to display the menu
   */
  openContextMenu: (nodeId: string, x: number, y: number): void => {
    freezeNode(nodeId);
    set({ contextMenu: { nodeId, x, y }, frozenNodeId: nodeId });
  },

  /**
   * Closes the context menu and "un-freezes" the associated node.
   */
  closeContextMenu: (): void => {
    const { frozenNodeId } = useGraphStore.getState();
    if (frozenNodeId) {
      unfreezeNode(frozenNodeId);
    }
    set({ contextMenu: null, frozenNodeId: null });
  },
}));
