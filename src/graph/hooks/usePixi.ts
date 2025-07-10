import { useRef, useEffect, useCallback, useMemo } from 'react';
import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { useGraphStore, type Node as GraphNode, type Link as GraphLink } from '../store';
import { initializeSimulation, startDragNode, dragNode, endDragNode, updateSimulationNodes } from '../simulation';
import { drawNode, drawLink } from '../drawing';

/**
 * Custom React hook for integrating PIXI.js with graph state.
 * Manages PIXI Application, drawing, zoom, pan, node dragging, and simulation updates.
 *
 * @param containerRef - React ref object pointing to the div where PIXI canvas mounts
 * @returns Object containing:
 *  - appRef: ref to the PIXI.Application instance
 *  - zoom: function to zoom the graph view by a scale factor
 *  - centerView: function to center the graph view on nodes
 *  - fitView: function to scale and position the graph to fit the viewport
 */
export const usePixi = (
  containerRef: React.RefObject<HTMLDivElement | null>
): {
  appRef: React.MutableRefObject<PIXI.Application | null>;
  zoom: (factor: number) => void;
  centerView: () => void;
  fitView: () => void;
} => {
  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);
  const pixiNodes = useRef<Map<string, PIXI.Container>>(new Map());
  const pixiLinks = useRef<Map<string, PIXI.Graphics>>(new Map());
  const { nodes, links, openContextMenu, renamingNodeId } = useGraphStore();

  const linkCurvatures = useMemo(() => {
    const curvatures = new Map<string, number>();
    const linkGroups = new Map<string, GraphLink[]>();
    links.forEach(link => {
        const source = link.source as GraphNode | string;
        const target = link.target as GraphNode | string;
        const sourceId = typeof source === 'object' ? source.id : source;
        const targetId = typeof target === 'object' ? target.id : target;
        const key = sourceId < targetId ? `${sourceId}-${targetId}` : `${targetId}-${sourceId}`;
        if (!linkGroups.has(key)) {
            linkGroups.set(key, []);
        }
        linkGroups.get(key)!.push(link);
    });

    linkGroups.forEach((group) => {
        if (group.length === 0) return;
        
        const total = group.length;
        if (total === 1) {
            curvatures.set(group[0].id, 0.15);
            return;
        }

        group.sort((a, b) => a.id.localeCompare(b.id));

        const step = 0.25;
        const center = (total - 1) / 2;

        group.forEach((link, i) => {
            const curvature = (i - center) * step;
            curvatures.set(link.id, curvature);
        });
    });
    return curvatures;
  }, [links]);

  const isPanning = useRef<boolean>(false);
  const lastPanPoint = useRef<PIXI.Point>(new PIXI.Point());
  const activeDragTargetId = useRef<string | null>(null);


  /**
   * Handler for starting node drag interaction.
   * @param event - PIXI FederatedPointerEvent from pointer down on node container
   */
  const onNodeDragStart = useCallback((event: PIXI.FederatedPointerEvent): void => {
    if (event.button !== 0) return; // Only allow left-click to drag
    event.stopPropagation();
    const targetId = (event.currentTarget as PIXI.Container).name;
    if (targetId) {
      activeDragTargetId.current = targetId;
      const pixiNode = pixiNodes.current.get(targetId);
      if (pixiNode) pixiNode.alpha = 0.7;
      startDragNode(targetId);
    }
  }, []);

  /**
   * Handler for right-clicking a node to open the context menu.
   * @param event - PIXI FederatedPointerEvent from right-click on node container
   */
  const onNodeRightClick = useCallback(
    (event: PIXI.FederatedPointerEvent): void => {
      event.stopPropagation();
      const targetId = (event.currentTarget as PIXI.Container).name;
      if (targetId) {
        openContextMenu(targetId, event.global.x, event.global.y);
      }
    },
    [openContextMenu]
  );

  /**
   * Updates the resolution (quality) of text elements based on current zoom level.
   * Ensures crisp text rendering at different scales.
   */
  const updateTextQuality = useCallback((): void => {
    if (!worldRef.current) return;
    const worldScale = worldRef.current.scale.x;
    const newResolution = Math.min(Math.max(2, worldScale * 2), 8);
    pixiNodes.current.forEach((nodeContainer) => {
      const text = nodeContainer.getChildAt(1) as PIXI.Text | undefined;
      if (text && text.resolution !== newResolution) {
        text.resolution = newResolution;
        text.style = text.style; // Trigger style refresh
      }
    });
  }, []);

  /**
   * Zooms the world container by a specified factor with smooth animation.
   * Zoom is centered around screen center.
   *
   * @param factor - Scale multiplier (>1 zooms in, <1 zooms out)
   */
  const zoom = useCallback((factor: number): void => {
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

  /**
   * Centers the world view on the average position of all nodes with smooth animation.
   */
  const centerView = useCallback((): void => {
    if (!worldRef.current || !appRef.current || nodes.length === 0) return;
    const world = worldRef.current;
    const app = appRef.current;
    const centerX = nodes.reduce((acc, n) => acc + (n.x ?? 0), 0) / nodes.length;
    const centerY = nodes.reduce((acc, n) => acc + (n.y ?? 0), 0) / nodes.length;
    const targetX = app.screen.width / 2 - centerX * world.scale.x;
    const targetY = app.screen.height / 2 - centerY * world.scale.y;
    gsap.to(world, { x: targetX, y: targetY, duration: 0.5, ease: "power2.out" });
  }, [nodes]);

  /**
   * Adjusts zoom and position to fit all nodes inside the viewport with padding.
   */
  const fitView = useCallback((): void => {
    if (!worldRef.current || !appRef.current || nodes.length === 0) return;
    const world = worldRef.current;
    const app = appRef.current;
    const padding = 100;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((node) => {
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

  /**
   * Handles mouse wheel events for zooming with the mouse cursor as zoom focus.
   *
   * @param event - WheelEvent triggered by mouse wheel scrolling
   */
  const handleZoom = useCallback((event: WheelEvent): void => {
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

  console.log(nodes);
  // Effect for initializing the PIXI application and scene graph
  useEffect(() => {
    if (!containerRef.current || appRef.current || nodes.length === 0) return;

    const init = async (): Promise<void> => {
      const app = new PIXI.Application();
      await app.init({
        // width: window.innerWidth, height: window.innerHeight,
        backgroundColor: 0xf4f7fa, antialias: true, resizeTo: window,
      });
      appRef.current = app;
    //   console.log("here")
      containerRef.current!.appendChild(app.canvas);
    //   console.log(app.canvas)

      const world = new PIXI.Container();
      worldRef.current = world;
      app.stage.addChild(world);

      const linksContainer = new PIXI.Container();
      world.addChild(linksContainer);
      const nodesContainer = new PIXI.Container();
      world.addChild(nodesContainer);

      links.forEach((link) => {
        const linkGfx = new PIXI.Graphics();
        linksContainer.addChild(linkGfx);
        pixiLinks.current.set(link.id, linkGfx);
      });

      nodes.forEach((nodeData) => {
        const nodeContainer = drawNode(nodeData);
        nodeContainer.on("pointerdown", onNodeDragStart);
        nodeContainer.on("rightdown", onNodeRightClick);
        nodesContainer.addChild(nodeContainer);
        pixiNodes.current.set(nodeData.id, nodeContainer);
      });

      const onTick = (): void => {
        nodes.forEach((node) => {
            
            const pixiNode = pixiNodes.current.get(node.id);
            if (pixiNode && node.x !== undefined && node.y !== undefined) {
                pixiNode.x = node.x;
                pixiNode.y = node.y;
            }
  
        });
        if (nodes.length > 0) {
            const centerX = nodes.reduce((acc, n) => acc + (n.x ?? 0), 0) / nodes.length;
            const centerY = nodes.reduce((acc, n) => acc + (n.y ?? 0), 0) / nodes.length;
            const graphCenter = new PIXI.Point(centerX, centerY);

            links.forEach((link) => {
              const linkGfx = pixiLinks.current.get(link.id);
              if (linkGfx && typeof link.source !== 'string' && typeof link.target !== 'string') {
                const curvature = linkCurvatures.get(link.id) ?? 0;
                drawLink(linkGfx, link.source as GraphNode, link.target as GraphNode, curvature, graphCenter);
              }
            });
        } else {
            links.forEach((link) => {
              const linkGfx = pixiLinks.current.get(link.id);
              if (linkGfx && typeof link.source !== 'string' && typeof link.target !== 'string') {
                const curvature = linkCurvatures.get(link.id) ?? 0;
                drawLink(linkGfx, link.source as GraphNode, link.target as GraphNode, curvature);
              }
            });
        }
      };

      initializeSimulation(nodes, links as GraphLink[], onTick);

      const mousePosition = new PIXI.Point();

      /**
       * Pointer move handler to update dragging or panning.
       */
      function onPointerMove(event: PIXI.FederatedPointerEvent): void {
        mousePosition.copyFrom(event.global);
        if (activeDragTargetId.current) {
        console.log("activeDragTargetId", activeDragTargetId.current)
          const newPos = world.toLocal(mousePosition);
          console.log("newPos", newPos.x, newPos.y)
          dragNode(activeDragTargetId.current, newPos.x, newPos.y);
          console.log("dragNode", nodes.find(n => n.id === activeDragTargetId.current)?.x, nodes.find(n => n.id === activeDragTargetId.current)?.y);
        } else if (isPanning.current) {
          world.x += mousePosition.x - lastPanPoint.current.x;
          world.y += mousePosition.y - lastPanPoint.current.y;
          lastPanPoint.current.copyFrom(mousePosition);
        }
      }

      /**
       * Global pointer up handler to stop drag or pan.
       */
      function onPointerUpGlobal(): void {
        if (activeDragTargetId.current) {
          const pixiNode = pixiNodes.current.get(activeDragTargetId.current);
          if (pixiNode) pixiNode.alpha = 1;
          endDragNode(activeDragTargetId.current);
          activeDragTargetId.current = null;
        }
        isPanning.current = false;
      }

      /**
       * Pointer down handler on world container to start panning.
       */
      function onWorldPanStart(event: PIXI.FederatedPointerEvent): void {
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
  }, [nodes.length, links.length, containerRef, handleZoom, onNodeDragStart, onNodeRightClick, linkCurvatures]);

  // Effect to update node visibility when renaming
  useEffect(() => {
    if (!worldRef.current) return;

    pixiNodes.current.forEach((nodeContainer, nodeId) => {
      const isRenaming = nodeId === renamingNodeId;
      const text = nodeContainer.getChildAt(1) as PIXI.Text | undefined;
      if (text) {
        text.visible = !isRenaming;
      }
    });
  }, [renamingNodeId]);

  // Effect to add newly added nodes to PIXI container and simulation
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
      nodeContainer.on("rightdown", onNodeRightClick);

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

  }, [nodes, onNodeDragStart, onNodeRightClick]);

  // Effect to update node labels
  useEffect(() => {
    if (!worldRef.current) return;

    nodes.forEach((node) => {
      const pixiNode = pixiNodes.current.get(node.id);
      if (pixiNode) {
        const text = pixiNode.getChildAt(1) as PIXI.Text | undefined;
        if (text && text.text !== node.label) {
          text.text = node.label;
        }
      }
    });
  }, [nodes]);

  return { appRef, zoom, centerView, fitView };
};
