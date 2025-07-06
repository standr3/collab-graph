import React, { useEffect, useRef, useCallback, useState } from "react";
import * as PIXI from "pixi.js";
import { useGraphStore, type Node as GraphNode, type Link as GraphLink } from "./store";
import { initializeSimulation, startDragNode, dragNode, endDragNode } from "./logic";
import { gsap } from "gsap";

const Toolbar: React.FC<{ onZoomIn: () => void; onZoomOut: () => void; onCenterView: () => void; onFitView: () => void; }> = ({ onZoomIn, onZoomOut, onCenterView, onFitView }) => {
    return (
        <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-80 p-2 rounded-lg shadow-lg flex flex-col space-y-2 z-10">
            <button onClick={onZoomIn} title="Zoom In" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">➕</button>
            <button onClick={onZoomOut} title="Zoom Out" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">➖</button>
            <button onClick={onCenterView} title="Centrează Vederea" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">🎯</button>
            <button onClick={onFitView} title="Încadrează Vederea" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">🖼️</button>
        </div>
    );
};

const StatsPanel: React.FC<{ fps: number }> = ({ fps }) => {
    return (
        <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-70 p-3 rounded-lg shadow-lg text-white text-xs font-mono z-10">
            <div>FPS: {fps.toFixed(1)}</div>
        </div>
    );
};

const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);

  const pixiNodes = useRef(new Map<string, PIXI.Container>());
  const pixiLinks = useRef(new Map<string, PIXI.Graphics>());

  const { nodes, links, initializeGraph } = useGraphStore();
  
  const [fps, setFps] = useState(0);
  const isPanning = useRef(false);
  const lastPanPoint = useRef(new PIXI.Point());
  const activeDragTargetId = useRef<string | null>(null);

  const getRectEdgePoint = useCallback((sourcePoint: PIXI.Point, targetNode: GraphNode): PIXI.Point => {
    const sx = sourcePoint.x;
    const sy = sourcePoint.y;
    const tx = targetNode.x ?? 0;
    const ty = targetNode.y ?? 0;
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

  const drawLink = useCallback((linkGfx: PIXI.Graphics, sourceNode: GraphNode, targetNode: GraphNode) => {
    linkGfx.clear();
    if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return;
    const startPoint = getRectEdgePoint(new PIXI.Point(targetNode.x, targetNode.y), sourceNode);
    const endPoint = getRectEdgePoint(new PIXI.Point(sourceNode.x, sourceNode.y), targetNode);
    let sx = startPoint.x;
    let sy = startPoint.y;
    let ex = endPoint.x;
    let ey = endPoint.y;
    const dx = ex - sx;
    const dy = ey - sy;
    const angle = Math.atan2(dy, dx);
    const padding = 3;
    sx += padding * Math.cos(angle);
    sy += padding * Math.sin(angle);
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
    const newScale = event.deltaY < 0 ? world.scale.x * scaleFactor : world.scale.x / scaleFactor;
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
      if (!worldRef.current || !appRef.current || nodes.length === 0) return;
      const world = worldRef.current;
      const app = appRef.current;
      const centerX = nodes.reduce((acc, n) => acc + (n.x ?? 0), 0) / nodes.length;
      const centerY = nodes.reduce((acc, n) => acc + (n.y ?? 0), 0) / nodes.length;
      const targetX = app.screen.width / 2 - centerX * world.scale.x;
      const targetY = app.screen.height / 2 - centerY * world.scale.y;
      gsap.to(world, { x: targetX, y: targetY, duration: 0.5, ease: "power2.out" });
  }, [nodes]);

  const fitView = useCallback(() => {
    if (!worldRef.current || !appRef.current || nodes.length === 0) return;
    const world = worldRef.current;
    const app = appRef.current;
    const padding = 100;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        minX = Math.min(minX, node.x ?? Infinity);
        maxX = Math.max(maxX, node.x ?? -Infinity);
        minY = Math.min(minY, node.y ?? Infinity);
        maxY = Math.max(maxY, node.y ?? -Infinity);
    });
    if(minX === Infinity) return;
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
    gsap.to(world.scale, { x: newScale, y: newScale, duration: 0.5, onUpdate: updateTextQuality });
  }, [nodes, updateTextQuality]);

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
    if (!containerRef.current || appRef.current || nodes.length === 0) return;

    const init = async () => {
        const app = new PIXI.Application();
        await app.init({
            width: window.innerWidth, height: window.innerHeight,
            backgroundColor: 0xf4f7fa, antialias: true, resizeTo: window,
        });
        appRef.current = app;
        containerRef.current!.appendChild(app.canvas);
        
        const world = new PIXI.Container();
        worldRef.current = world;
        app.stage.addChild(world);
        
        const linksContainer = new PIXI.Container();
        world.addChild(linksContainer);
        const nodesContainer = new PIXI.Container();
        world.addChild(nodesContainer);

        links.forEach(link => {
            const linkGfx = new PIXI.Graphics();
            linksContainer.addChild(linkGfx);
            pixiLinks.current.set(link.id, linkGfx);
        });

        nodes.forEach(nodeData => {
            const nodeContainer = new PIXI.Container();
            nodeContainer.name = nodeData.id;
            
            const minWidth = 80, maxWidth = 180, padding = 16;
            const textStyle: PIXI.TextStyleOptions = { fontFamily: `'Inter', sans-serif`, fontSize: 14, fill: 0x1a202c, align: "center", wordWrap: true, wordWrapWidth: maxWidth - padding * 2, lineHeight: 18 };
            const tempText = new PIXI.Text({ text: nodeData.label, style: textStyle });
            nodeData.width = Math.max(minWidth, tempText.width + padding * 2);
            nodeData.height = Math.max(40, tempText.height + padding * 2);
            tempText.destroy();

            const box = new PIXI.Graphics().roundRect(0, 0, nodeData.width, nodeData.height, 10).fill({color: 0xffffff, alpha: 0.9}).stroke({ width: 1, color: 0x000000, alpha: 0.1 });
            const text = new PIXI.Text({ text: nodeData.label, style: {...textStyle, wordWrapWidth: nodeData.width - 32}});
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
            nodeContainer.addChild(box, text);
            nodesContainer.addChild(nodeContainer);
            nodeContainer.eventMode = "static";
            nodeContainer.cursor = "pointer";
            nodeContainer.on("pointerdown", onNodeDragStart);
            pixiNodes.current.set(nodeData.id, nodeContainer);
        });

        const onTick = () => {
            nodes.forEach(node => {
                const pixiNode = pixiNodes.current.get(node.id);
                if (pixiNode && node.x && node.y) {
                    pixiNode.x = node.x;
                    pixiNode.y = node.y;
                }
            });
            links.forEach(link => {
                const linkGfx = pixiLinks.current.get(link.id);
                if (linkGfx && typeof link.source !== 'string' && typeof link.target !== 'string') {
                    drawLink(linkGfx, link.source as GraphNode, link.target as GraphNode);
                }
            });
        };

        initializeSimulation(nodes, links as GraphLink[], onTick);

        app.ticker.add(() => setFps(app.ticker.FPS));

        const mousePosition = new PIXI.Point();
        function onPointerMove(event: PIXI.FederatedPointerEvent) {
            mousePosition.copyFrom(event.global);
            if (activeDragTargetId.current) {
                const newPos = world.toLocal(mousePosition);
                dragNode(activeDragTargetId.current, newPos.x, newPos.y);
            } else if (isPanning.current) {
                world.x += mousePosition.x - lastPanPoint.current.x;
                world.y += mousePosition.y - lastPanPoint.current.y;
                lastPanPoint.current.copyFrom(mousePosition);
            }
        }
        function onPointerUpGlobal() {
            if (activeDragTargetId.current) {
                const pixiNode = pixiNodes.current.get(activeDragTargetId.current);
                if(pixiNode) pixiNode.alpha = 1;
                endDragNode(activeDragTargetId.current);
                activeDragTargetId.current = null;
            }
            isPanning.current = false;
        }
        function onNodeDragStart(event: PIXI.FederatedPointerEvent) {
            event.stopPropagation();
            const targetId = (event.currentTarget as PIXI.Container).name;
            activeDragTargetId.current = targetId;
            const pixiNode = pixiNodes.current.get(targetId);
            if(pixiNode) pixiNode.alpha = 0.7;
            startDragNode(targetId);
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
    };

    if (nodes.length > 0 && links.length > 0) {
        init();
    }

    const container = containerRef.current;
    container?.addEventListener('wheel', handleZoom, { passive: false });

    return () => {
        container?.removeEventListener('wheel', handleZoom);
        appRef.current?.destroy(true);
        appRef.current = null;
    };
  }, [nodes, links, drawLink, initializeGraph, handleZoom]);

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
