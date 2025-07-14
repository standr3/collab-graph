import React, { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useGraphStore } from "./store";
import { usePixi } from "./hooks/usePixi";
import Toolbar from "./components/Toolbar";
import { ContextMenu } from "./components/ContextMenu";
import { RenameNodeInput } from "./components/RenameNodeInput";
// import StatsPanel from "./components/StatsPanel";

/**
 * React functional component rendering the interactive graph canvas.
 * Manages graph initialization, PixiJS setup, and UI controls.
 */
const Canvas: React.FC = () => {
  // Ref for the container DOM element where PixiJS app will mount
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom hook for PixiJS integration, provides app ref and control functions
  const { zoom, centerView, fitView } = usePixi(containerRef);

  // Extract actions from Zustand store to initialize and modify graph state
  const { initializeGraph, addNode, closeContextMenu } = useGraphStore();
  const graphInitialized = useRef(false);

  /**
   * Effect to initialize graph state once on component mount.
   * Sets up initial nodes and links in Zustand store.
   */
  useEffect(() => {
    const container = containerRef.current;
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    container?.addEventListener("contextmenu", preventContextMenu);

    return () => {
      container?.removeEventListener("contextmenu", preventContextMenu);
    };
  }, []);

  /**
   * Effect to initialize graph state once on component mount.
   * Sets up initial nodes and links in Zustand store.
   */
  useEffect(() => {
    // Prevent re-initialization on StrictMode re-mount
    if (graphInitialized.current) return;
    graphInitialized.current = true;

    const initialNodes = [
      { id: "1", label: "Start" },
      { id: "2", label: "Analiza Inițială a Cerințelor" },
      { id: "3", label: "Design Arhitectural și Prototipare Interfață Utilizator" },
      { id: "4", label: "Dezvoltarea backend-ului cu microservicii, integrarea bazei de date și implementarea logicii de business complexe" },
      { id: "5", label: "Testare QA" },
      { id: "6", label: "Revizuire și Feedback Client" },
      { id: "7", label: "Deployment" },
    ];

    const initialLinks = [
      { id: "l1", source: "1", target: "2" },
      { id: "l2", source: "2", target: "3" },
      { id: "l3", source: "2", target: "5" },
      { id: "l4", source: "3", target: "4" },
      { id: "l5", source: "4", target: "6" },
      { id: "l6", source: "5", target: "6" },
      { id: "l7", source: "6", target: "7" },
    ];

    initializeGraph(initialNodes, initialLinks);
  }, [initializeGraph]);

  /**
   * Handler invoked by Toolbar to add a new node to the graph.
   * Generates a unique ID using uuid.
   */
  const handleAddNode = (): void => {
    const newNode = {
      id: uuidv4(),
      label: "Nod Nou",
    };
    addNode(newNode);
  };

  return (
    <div
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
      onClick={closeContextMenu}
    >
      <Toolbar
        onZoomIn={() => zoom(1.2)}
        onZoomOut={() => zoom(0.8)}
        onCenterView={centerView}
        onFitView={fitView}
        onAddNode={handleAddNode}
      />
      <ContextMenu />
      <RenameNodeInput />
      {/* Removed StatsPanel since fps is no longer tracked */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default Canvas;
