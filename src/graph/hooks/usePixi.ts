import { useRef, useEffect, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { useGraphStore, type Node as GraphNode, type Link as GraphLink } from '../store';
import { initializeSimulation, startDragNode, dragNode, endDragNode, updateSimulationNodes } from '../simulation';
import { drawNode, drawLink } from '../drawing';

export const usePixi = (containerRef: React.RefObject<HTMLDivElement | null>) => {
    const appRef = useRef<PIXI.Application | null>(null);
    const worldRef = useRef<PIXI.Container | null>(null);
    const pixiNodes = useRef(new Map<string, PIXI.Container>());
    const pixiLinks = useRef(new Map<string, PIXI.Graphics>());
    const { nodes, links } = useGraphStore();
    const isPanning = useRef(false);
    const lastPanPoint = useRef(new PIXI.Point());
    const activeDragTargetId = useRef<string | null>(null);

    const onNodeDragStart = useCallback((event: PIXI.FederatedPointerEvent) => {
        event.stopPropagation();
        const targetId = (event.currentTarget as PIXI.Container).name;
        if (targetId) {
            activeDragTargetId.current = targetId;
            const pixiNode = pixiNodes.current.get(targetId);
            if (pixiNode) pixiNode.alpha = 0.7;
            startDragNode(targetId);
        }
    }, []);

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
        if (minX === Infinity) return;
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

    // Effect for initializing the PIXI application
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
                const nodeContainer = drawNode(nodeData);
                nodeContainer.on("pointerdown", onNodeDragStart);
                nodesContainer.addChild(nodeContainer);
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
                    if (pixiNode) pixiNode.alpha = 1;
                    endDragNode(activeDragTargetId.current);
                    activeDragTargetId.current = null;
                }
                isPanning.current = false;
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
    }, [nodes.length === 7, links.length, containerRef, handleZoom, onNodeDragStart]);

    // Effect for adding new nodes
    useEffect(() => {
        const world = worldRef.current;
        if (!world) return;

        const nodesContainer = world.getChildAt(1) as PIXI.Container;
        if (!nodesContainer) return;

        const currentPixiNodeIds = Array.from(pixiNodes.current.keys());
        const newNodes = nodes.filter(n => !currentPixiNodeIds.includes(n.id));

        newNodes.forEach(nodeData => {
            const nodeContainer = drawNode(nodeData);
            nodeContainer.on("pointerdown", onNodeDragStart);
            
            const worldPoint = new PIXI.Point(window.innerWidth / 2, window.innerHeight / 2);
            const localPoint = world.toLocal(worldPoint);
            nodeData.x = localPoint.x;
            nodeData.y = localPoint.y;
            nodeContainer.x = localPoint.x;
            nodeContainer.y = localPoint.y;
            
            nodesContainer.addChild(nodeContainer);
            pixiNodes.current.set(nodeData.id, nodeContainer);
        });

        if (newNodes.length > 0) {
            updateSimulationNodes(nodes);
        }

    }, [nodes, onNodeDragStart]);

    return { appRef, zoom, centerView, fitView };
};
