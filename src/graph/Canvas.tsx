// src/components/Canvas.tsx
import React, { useEffect, useRef, useCallback, useState } from "react";
import * as PIXI from "pixi.js";
import { useGraphStore } from "./graphStore";
import { gsap } from "gsap"; // Vom folosi GSAP pentru animații fluide

// --- Tipuri de date ---
interface D3Node {
  id: string;
  label: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  width: number;
  height: number;
}

// --- Componenta Toolbar ---
const Toolbar: React.FC<{
    onZoomIn: () => void;
    onZoomOut: () => void;
    onCenterView: () => void;
    onFitView: () => void;
}> = ({ onZoomIn, onZoomOut, onCenterView, onFitView }) => {
    return (
        <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-80 p-2 rounded-lg shadow-lg flex flex-col space-y-2 z-10">
            <button onClick={onZoomIn} title="Zoom In" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">➕</button>
            <button onClick={onZoomOut} title="Zoom Out" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">➖</button>
            <button onClick={onCenterView} title="Centrează Vederea" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">🎯</button>
            <button onClick={onFitView} title="Încadrează Vederea" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">🖼️</button>
        </div>
    );
};

// --- NOU: Componenta pentru statistici de performanță ---
const StatsPanel: React.FC<{ fps: number }> = ({ fps }) => {
    return (
        <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-70 p-3 rounded-lg shadow-lg text-white text-xs font-mono z-10">
            <div>FPS: {fps.toFixed(1)}</div>
        </div>
    );
};


// --- Componenta Principală Canvas ---
const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);

  const pixiNodes = useRef(new Map<string, PIXI.Container>());
  const pixiLinks = useRef(new Map<string, PIXI.Graphics>());
  const simulationNodesRef = useRef<D3Node[]>([]);

  const { nodes, links } = useGraphStore();
  
  const [fps, setFps] = useState(0);
  const isPanning = useRef(false);
  const lastPanPoint = useRef(new PIXI.Point());
  const activeDragTarget = useRef<PIXI.Container | null>(null);

  // --- Funcții de Desenare și Actualizare ---

  const getRectEdgePoint = useCallback((sourcePoint: PIXI.Point, targetNode: D3Node): PIXI.Point => {
    const sx = sourcePoint.x;
    const sy = sourcePoint.y;
    const tx = targetNode.x;
    const ty = targetNode.y;
    const { width: targetW, height: targetH } = targetNode;

    const dx = tx - sx;
    const dy = ty - sy;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return new PIXI.Point(tx, ty);

    const halfW = targetW / 2;
    const halfH = targetH / 2;
    
    const slopeY = dy / dx;
    const slopeX = dx / dy;
    
    let endX = tx;
    let endY = ty;

    if (Math.abs(slopeY) < halfH / halfW) {
        if (dx > 0) { endX = tx - halfW; endY = ty - halfW * slopeY; } 
        else { endX = tx + halfW; endY = ty + halfW * slopeY; }
    } else {
        if (dy > 0) { endY = ty - halfH; endX = tx - halfH * slopeX; } 
        else { endY = ty + halfH; endX = tx + halfH * slopeX; }
    }
    return new PIXI.Point(endX, endY);
  }, []);

  const drawLink = useCallback((linkGfx: PIXI.Graphics, sourceNode: D3Node, targetNode: D3Node) => {
    linkGfx.clear();

    const startPoint = getRectEdgePoint(new PIXI.Point(targetNode.x, targetNode.y), sourceNode);
    const endPoint = getRectEdgePoint(new PIXI.Point(sourceNode.x, sourceNode.y), targetNode);
    
    const sx = startPoint.x;
    const sy = startPoint.y;
    let ex = endPoint.x;
    let ey = endPoint.y;

    const dx = ex - sx;
    const dy = ey - sy;
    const angle = Math.atan2(dy, dx);
    
    const padding = 3;
    ex -= padding * Math.cos(angle);
    ey -= padding * Math.sin(angle);

    linkGfx.moveTo(sx, sy);
    linkGfx.lineTo(ex, ey);
    linkGfx.stroke({ width: 1.5, color: 0xabb8c3, alpha: 0.9 });

    const arrowSize = 8;
    const arrowAngle = Math.PI / 7;
    const p1x = ex - arrowSize * Math.cos(angle - arrowAngle);
    const p1y = ey - arrowSize * Math.sin(angle - arrowAngle);
    const p2x = ex - arrowSize * Math.cos(angle + arrowAngle);
    const p2y = ey - arrowSize * Math.sin(angle + arrowAngle);

    linkGfx.moveTo(ex, ey);
    linkGfx.lineTo(p1x, p1y);
    linkGfx.moveTo(ex, ey);
    linkGfx.lineTo(p2x, p2y);
    linkGfx.stroke({ width: 1.5, color: 0xabb8c3, alpha: 0.9 });
  }, [getRectEdgePoint]);

  const updateAllLinks = useCallback(() => {
    const nodeMap = new Map(simulationNodesRef.current.map(n => [n.id, n]));
    pixiLinks.current.forEach((gfx, linkId) => {
      const linkData = links.find(l => l.id === linkId);
      if (linkData) {
        const sourceNode = nodeMap.get(linkData.source);
        const targetNode = nodeMap.get(linkData.target);
        if (sourceNode && targetNode) {
          drawLink(gfx, sourceNode, targetNode);
        }
      }
    });
  }, [links, drawLink]);
  
  const updateTextQuality = useCallback(() => {
    if (!worldRef.current) return;
    const worldScale = worldRef.current.scale.x;
    const newResolution = Math.min(Math.max(2, worldScale * 2), 8); 

    pixiNodes.current.forEach(nodeContainer => {
        const text = nodeContainer.getChildAt(1) as PIXI.Text | undefined;
        if (text && text.resolution !== newResolution) {
            text.resolution = newResolution;
            text.style = text.style; 
        }
    });
  }, []);

  const handleZoom = useCallback((event: WheelEvent) => {
    event.preventDefault();
    if (!worldRef.current) return;
    const world = worldRef.current;
    const scaleFactor = 1.1;
    const oldScale = world.scale.x;
    const newScale = event.deltaY < 0 ? oldScale * scaleFactor : oldScale / scaleFactor;
    const mousePosition = new PIXI.Point(event.clientX, event.clientY);
    const worldPoint = world.toLocal(mousePosition);
    const newWorldX = mousePosition.x - worldPoint.x * newScale;
    const newWorldY = mousePosition.y - worldPoint.y * newScale;
    world.scale.set(newScale);
    world.position.set(newWorldX, newWorldY);
    updateTextQuality();
  }, [updateTextQuality]);

  const zoom = useCallback((factor: number) => {
      if (!worldRef.current || !appRef.current) return;
      const world = worldRef.current;
      const newScale = world.scale.x * factor;
      const screenCenter = new PIXI.Point(appRef.current.screen.width / 2, appRef.current.screen.height / 2);
      const worldPoint = world.toLocal(screenCenter);
      const newWorldX = screenCenter.x - worldPoint.x * newScale;
      const newWorldY = screenCenter.y - worldPoint.y * newScale;
      gsap.to(world, { x: newWorldX, y: newWorldY, duration: 0.3, ease: "power2.out" });
      gsap.to(world.scale, { x: newScale, y: newScale, duration: 0.3, onUpdate: updateTextQuality });
  }, [updateTextQuality]);

  const centerView = useCallback(() => {
      if (!worldRef.current || !appRef.current || simulationNodesRef.current.length === 0) return;
      const world = worldRef.current;
      const app = appRef.current;
      const nodes = simulationNodesRef.current;
      const centerX = nodes.reduce((acc, n) => acc + n.x, 0) / nodes.length;
      const centerY = nodes.reduce((acc, n) => acc + n.y, 0) / nodes.length;
      const targetX = app.screen.width / 2 - centerX * world.scale.x;
      const targetY = app.screen.height / 2 - centerY * world.scale.y;
      gsap.to(world, { x: targetX, y: targetY, duration: 0.5, ease: "power2.out" });
  }, []);

  const fitView = useCallback(() => {
    if (!worldRef.current || !appRef.current || simulationNodesRef.current.length === 0) return;
    const world = worldRef.current;
    const app = appRef.current;
    const nodes = simulationNodesRef.current;
    const padding = 100;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
    });
    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);
    const scaleX = (app.screen.width - padding) / graphWidth;
    const scaleY = (app.screen.height - padding) / graphHeight;
    const newScale = Math.min(scaleX, scaleY, 2);
    const centerX = minX + graphWidth / 2;
    const centerY = minY + graphHeight / 2;
    const targetX = app.screen.width / 2 - centerX * newScale;
    const targetY = app.screen.height / 2 - centerY * newScale;
    gsap.to(world, { x: targetX, y: targetY, duration: 0.5, ease: "power2.out" });
    gsap.to(world.scale, { x: newScale, y: newScale, duration: 0.5, ease: "power2.out", onUpdate: updateTextQuality });
  }, [updateTextQuality]);

  useEffect(() => {
    const initializePixi = async () => {
      if (!containerRef.current || appRef.current) return;
      const app = new PIXI.Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0xf4f7fa,
        antialias: true,
        resizeTo: window,
      });
      appRef.current = app;
      containerRef.current.appendChild(app.canvas);
      
      const world = new PIXI.Container();
      worldRef.current = world;
      app.stage.addChild(world);
      
      const linksContainer = new PIXI.Container();
      world.addChild(linksContainer);
      const nodesContainer = new PIXI.Container();
      world.addChild(nodesContainer);
      
      let dragOffset = new PIXI.Point();
      const mousePosition = new PIXI.Point();

      // --- NOU: Logică de mișcare decuplată de evenimente, în ticker-ul principal ---
      app.ticker.add(() => {
        // Actualizăm panoul de statistici
        setFps(app.ticker.FPS);

        // Mutăm nodul activ (drag)
        if (activeDragTarget.current) {
            const newPos = world.toLocal(mousePosition);
            activeDragTarget.current.x = newPos.x - dragOffset.x;
            activeDragTarget.current.y = newPos.y - dragOffset.y;
            const nodeData = simulationNodesRef.current.find(n => n.id === activeDragTarget.current!.name)!;
            nodeData.x = activeDragTarget.current.x;
            nodeData.y = activeDragTarget.current.y;
            nodeData.fx = nodeData.x;
            nodeData.fy = nodeData.y;
            updateAllLinks();
        } 
        // Mutăm scena (pan)
        else if (isPanning.current) {
            world.x += mousePosition.x - lastPanPoint.current.x;
            world.y += mousePosition.y - lastPanPoint.current.y;
            lastPanPoint.current.copyFrom(mousePosition);
        }
      });

      function onPointerMove(event: PIXI.FederatedPointerEvent) {
        mousePosition.copyFrom(event.global);
      }

      function onPointerUpGlobal() {
        if (activeDragTarget.current) {
          const nodeData = simulationNodesRef.current.find(n => n.id === activeDragTarget.current!.name)!;
          nodeData.fx = null;
          nodeData.fy = null;
          activeDragTarget.current.alpha = 1;
          activeDragTarget.current = null;
        }
        isPanning.current = false;
      }
      
      function onNodeDragStart(event: PIXI.FederatedPointerEvent) {
        event.stopPropagation();
        activeDragTarget.current = event.currentTarget as PIXI.Container;
        const nodeData = simulationNodesRef.current.find(n => n.id === activeDragTarget.current!.name)!;
        nodeData.fx = nodeData.x;
        nodeData.fy = nodeData.y;
        world.toLocal(event.global, undefined, dragOffset);
        dragOffset.x -= activeDragTarget.current.x;
        dragOffset.y -= activeDragTarget.current.y;
        activeDragTarget.current.alpha = 0.7;
      }
      
      function onWorldPanStart(event: PIXI.FederatedPointerEvent) {
          if (event.target === world || event.button === 1) {
            isPanning.current = true;
            lastPanPoint.current.copyFrom(event.global);
          }
      }
      
      world.eventMode = "static";
      world.hitArea = app.screen;
      world.on("pointerdown", onWorldPanStart);
      
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.stage.on('pointermove', onPointerMove);
      app.stage.on('pointerup', onPointerUpGlobal);
      app.stage.on('pointerupoutside', onPointerUpGlobal);

      simulationNodesRef.current = nodes.map((node) => {
        const minWidth = 80;
        const maxWidth = 180;
        const padding = 16;
        const text = new PIXI.Text({
            text: node.label,
            style: {
                fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
                fontSize: 14,
                fill: 0x1a202c,
                align: "center",
                wordWrap: true,
                wordWrapWidth: maxWidth - padding * 2,
                lineHeight: 18,
            }
        });
        text.resolution = 2;
        if (text.height > 18 * 3) {
            let truncatedText = node.label;
            while(text.height > 18*3 && truncatedText.length > 0) {
                truncatedText = truncatedText.slice(0, -5) + "...";
                text.text = truncatedText;
            }
        }
        const boxWidth = Math.max(minWidth, text.width / text.resolution + padding * 2);
        const boxHeight = text.height / text.resolution + padding * 2;
        return {
          ...node,
          x: Math.random() * window.innerWidth * 0.8,
          y: Math.random() * window.innerHeight * 0.8,
          width: boxWidth,
          height: boxHeight,
        };
      });

      links.forEach(link => {
        const linkGfx = new PIXI.Graphics();
        linksContainer.addChild(linkGfx);
        pixiLinks.current.set(link.id, linkGfx);
      });

      simulationNodesRef.current.forEach(nodeData => {
        const nodeContainer = new PIXI.Container();
        nodeContainer.name = nodeData.id;
        nodeContainer.x = nodeData.x;
        nodeContainer.y = nodeData.y;
        
        const box = new PIXI.Graphics()
            .roundRect(0, 0, nodeData.width, nodeData.height, 10)
            .fill({color: 0xffffff, alpha: 0.9})
            .stroke({ width: 1, color: 0x000000, alpha: 0.1 });

        const text = new PIXI.Text({
            text: nodeData.label,
            style: {
                fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
                fontSize: 14,
                fill: 0x1a202c,
                align: "center",
                wordWrap: true,
                wordWrapWidth: nodeData.width - 32,
                lineHeight: 18,
            }
        });
        text.resolution = 2;
         if (text.height > 18 * 3) {
            let truncatedText = nodeData.label;
            while(text.height > 18*3 && truncatedText.length > 0) {
                truncatedText = truncatedText.slice(0, -5) + "...";
                text.text = truncatedText;
            }
        }

        box.pivot.set(nodeData.width / 2, nodeData.height / 2);
        text.anchor.set(0.5);
        text.scale.set(1 / text.resolution);

        nodeContainer.addChild(box);
        nodeContainer.addChild(text);
        nodesContainer.addChild(nodeContainer);
        
        nodeContainer.eventMode = "static";
        nodeContainer.cursor = "pointer";
        nodeContainer.on("pointerdown", onNodeDragStart);
        
        pixiNodes.current.set(nodeData.id, nodeContainer);
      });
      
      updateAllLinks();
      fitView();
    };

    initializePixi();
    
    const container = containerRef.current;
    container?.addEventListener('wheel', handleZoom, { passive: false });

    return () => {
      container?.removeEventListener('wheel', handleZoom);
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
        worldRef.current = null;
        pixiNodes.current.clear();
        pixiLinks.current.clear();
      }
    };
  }, [nodes, links, updateAllLinks, handleZoom, fitView, centerView, zoom, updateTextQuality]);

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
