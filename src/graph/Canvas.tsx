import React, { useEffect, useRef, useState } from "react";
import { useGraphStore } from "./store";
import { usePixi } from "./hooks/usePixi";
import Toolbar from "./components/Toolbar";
import StatsPanel from "./components/StatsPanel";

const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { appRef, zoom, centerView, fitView } = usePixi(containerRef);
  const [fps, setFps] = useState(0);
  const { initializeGraph } = useGraphStore();

  useEffect(() => {
    const initialNodes = [
        { id: "1", label: "Start" }, { id: "2", label: "Analiza Inițială a Cerințelor" },
        { id: "3", label: "Design Arhitectural și Prototipare Interfață Utilizator" },
        { id: "4", label: "Dezvoltarea backend-ului cu microservicii, integrarea bazei de date și implementarea logicii de business complexe" },
        { id: "5", label: "Testare QA" }, { id: "6", label: "Revizuire și Feedback Client" },
        { id: "7", label: "Deployment" },
    ];
    const initialLinks = [
        { id: "l1", source: "1", target: "2" }, { id: "l2", source: "2", target: "3" },
        { id: "l3", source: "2", target: "5" }, { id: "l4", source: "3", target: "4" },
        { id: "l5", source: "4", target: "6" }, { id: "l6", source: "5", target: "6" },
        { id: "l7", source: "6", target: "7" },
    ];
    initializeGraph(initialNodes, initialLinks);
  }, [initializeGraph]);

  useEffect(() => {
    const app = appRef.current;
    if (app) {
      const ticker = () => setFps(app.ticker.FPS);
      app.ticker.add(ticker);
      return () => {
        app.ticker.remove(ticker);
      };
    }
  }, [appRef]);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Toolbar
        onZoomIn={() => zoom(1.2)}
        onZoomOut={() => zoom(0.8)}
        onCenterView={centerView}
        onFitView={fitView}
      />
      <StatsPanel fps={fps} />
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default Canvas;
