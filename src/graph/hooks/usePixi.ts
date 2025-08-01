import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { useGraphStore, type Node as GraphNode, type Link as GraphLink } from '../store';
import { initializeSimulation, startDragNode, dragNode, endDragNode, updateSimulationNodes, updateSimulationCenter, updateSimulationLinks, getSimulationNodes, stopSimulation } from '../simulation';
import { drawNode, drawLink } from '../drawing';
import pinIconUrl from '../../assets/pin.svg';
import { LINK_BASE_CURVATURE, LINK_CURVATURE_STEP } from '../config';

/**
 * A comprehensive React hook to manage a PIXI.js-based interactive graph.
 * This hook orchestrates the PIXI application, D3 force simulation, and user interactions.
 *
 * @param containerRef - A React ref to the div element that will host the PIXI canvas.
 * @returns An object containing control functions for the canvas view.
 */
export const usePixi = (
  containerRef: React.RefObject<HTMLDivElement | null>
): {
  /** A mutable ref to the PIXI.Application instance. */
  appRef: React.MutableRefObject<PIXI.Application | null>;
  /**
   * Zooms the view by a given factor.
   * @param factor - The zoom factor (e.g., 1.2 for zoom in, 0.8 for zoom out).
   */
  zoom: (factor: number) => void;
  /** Centers the view on the graph's barycenter. */
  centerView: () => void;
  /** Fits the entire graph within the current viewport. */
  fitView: () => void;
} => {
  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);
  const nodesContainerRef = useRef<PIXI.Container | null>(null);
  const linksContainerRef = useRef<PIXI.Container | null>(null);
  const pixiNodes = useRef<Map<string, PIXI.Container>>(new Map());
  const pixiLinks = useRef<Map<string, PIXI.Graphics>>(new Map());
  const pinSvgDataRef = useRef<PIXI.GraphicsContext | null>(null);
  const isPanning = useRef<boolean>(false);
  const lastPanPoint = useRef<PIXI.Point>(new PIXI.Point());
  const activeDragTargetId = useRef<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { nodes, links, openContextMenu, renamingNodeId, toggleNodePin } = useGraphStore();

  /**
   * Toggles the pinned state of a node. Memoized with useCallback.
   */
  const handlePinToggle = useCallback((nodeId: string) => {
    toggleNodePin(nodeId);
  }, [toggleNodePin]);

  /**
   * Handles the start of a node drag event.
   */
  const onNodeDragStart = useCallback((event: PIXI.FederatedPointerEvent): void => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const targetId = (event.currentTarget as PIXI.Container).label;
    if (targetId) {
      activeDragTargetId.current = targetId;
      const pixiNode = pixiNodes.current.get(targetId);
      if (pixiNode) pixiNode.alpha = 0.7;
      startDragNode(targetId);
    }
  }, []);

  /**
   * Handles the right-click event on a node to open the context menu.
   */
  const onNodeRightClick = useCallback(
    (event: PIXI.FederatedPointerEvent): void => {
      event.stopPropagation();
      const targetId = (event.currentTarget as PIXI.Container).label;
      if (targetId) {
        openContextMenu(targetId, event.global.x, event.global.y);
      }
    },
    [openContextMenu]
  );

  /**
   * Dynamically updates the resolution of text objects based on the world scale
   * to maintain sharpness when zoomed in.
   */
  const updateTextQuality = useCallback((): void => {
    if (!worldRef.current) return;
    const worldScale = worldRef.current.scale.x;
    const newResolution = Math.min(Math.max(2, worldScale * 2), 8);
    pixiNodes.current.forEach((nodeContainer) => {
      const text = nodeContainer.getChildAt(1) as PIXI.Text | undefined;
      if (text && text.resolution !== newResolution) {
        text.resolution = newResolution;
        text.style = text.style;
      }
    });
  }, []);

  /**
   * Programmatically zooms the view towards the center of the screen.
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
   * Smoothly animates the view to center on the calculated barycenter of all nodes.
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
   * Calculates the bounding box of all nodes and adjusts the viewport's scale and position
   * to fit the entire graph into view with a specified padding.
   */
  const fitView = useCallback((): void => {
    if (!worldRef.current || !appRef.current || nodes.length === 0) return;
    const world = worldRef.current;
    const app = appRef.current;
    const padding = 100; // This padding is for the view, not a graph element, so it stays.
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
   * Calculates curvatures for links to prevent overlaps between nodes with multiple links.
   * This is memoized to avoid recalculation on every render.
   */
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
            curvatures.set(group[0].id, LINK_BASE_CURVATURE);
            return;
        }
        group.sort((a, b) => a.id.localeCompare(b.id));
        const center = (total - 1) / 2;
        group.forEach((link, i) => {
            const curvature = (i - center) * LINK_CURVATURE_STEP;
            curvatures.set(link.id, curvature);
        });
    });
    return curvatures;
  }, [links]);
  const linkCurvaturesRef = useRef(linkCurvatures);
  linkCurvaturesRef.current = linkCurvatures;

  // Effect for PIXI App initialization
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    let isCancelled = false;
    const container = containerRef.current; // Capture ref for cleanup

    const handleZoom = (event: WheelEvent) => {
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
    };
    container.addEventListener('wheel', handleZoom, { passive: false });

    const init = async () => {
      const app = new PIXI.Application();
      await app.init({
        backgroundColor: 0xf4f7fa,
        antialias: true,
        resizeTo: window,
      });

      if (isCancelled) {
        app.destroy(true, true);
        return;
      }

      appRef.current = app;
      // Ensure container is still mounted before appending canvas
      if (containerRef.current) {
        containerRef.current.appendChild(app.canvas);
      } else {
        app.destroy(true, true);
        return;
      }

      const world = new PIXI.Container();
      worldRef.current = world;
      app.stage.addChild(world);

      linksContainerRef.current = new PIXI.Container();
      world.addChild(linksContainerRef.current);
      nodesContainerRef.current = new PIXI.Container();
      world.addChild(nodesContainerRef.current);

      pinSvgDataRef.current = await PIXI.Assets.load({
        src: pinIconUrl,
        data: { parseAsGraphicsContext: true },
      });

      if (isCancelled) return;

      const onTick = () => {
        const simulationNodes = getSimulationNodes();
        const nodeMap = new Map(simulationNodes.map(n => [n.id, n]));

        pixiNodes.current.forEach((pixiNode, id) => {
          const node = nodeMap.get(id);
          if (pixiNode && node?.x !== undefined && node?.y !== undefined) {
            pixiNode.x = node.x;
            pixiNode.y = node.y;
          }
        });

        const currentLinks = useGraphStore.getState().links;
        const graphCenter = simulationNodes.length > 0
          ? new PIXI.Point(
              simulationNodes.reduce((acc, n) => acc + (n.x ?? 0), 0) / simulationNodes.length,
              simulationNodes.reduce((acc, n) => acc + (n.y ?? 0), 0) / simulationNodes.length
            )
          : undefined;

        pixiLinks.current.forEach((linkGfx, id) => {
          const link = currentLinks.find(l => l.id === id);
          if (link) {
            const source = link.source as GraphNode | string | number;
            const target = link.target as GraphNode | string | number;
            const sourceId = typeof source === 'object' ? source.id : String(source);
            const targetId = typeof target === 'object' ? target.id : String(target);
            const sourceNode = nodeMap.get(sourceId);
            const targetNode = nodeMap.get(targetId);

            if (sourceNode && targetNode) {
              const curvature = linkCurvaturesRef.current.get(link.id) ?? 0;
              drawLink(linkGfx, sourceNode, targetNode, curvature, graphCenter);
            }
          }
        });
      };

      initializeSimulation(() => useGraphStore.getState().nodes, () => useGraphStore.getState().links, onTick, app.screen.width, app.screen.height);

      const onPointerMove = (event: PIXI.FederatedPointerEvent) => {
        const mousePosition = event.global;
        if (activeDragTargetId.current) {
          const newPos = world.toLocal(mousePosition);
          dragNode(activeDragTargetId.current, newPos.x, newPos.y);
        } else if (isPanning.current) {
          world.x += mousePosition.x - lastPanPoint.current.x;
          world.y += mousePosition.y - lastPanPoint.current.y;
          lastPanPoint.current.copyFrom(mousePosition);
        }
      };

      const onPointerUpGlobal = () => {
        if (activeDragTargetId.current) {
          const nodeId = activeDragTargetId.current;
          const latestNodes = useGraphStore.getState().nodes;
          const node = latestNodes.find((n) => n.id === nodeId);
          const pixiNode = pixiNodes.current.get(nodeId);
          if (pixiNode) pixiNode.alpha = 1;
          endDragNode(nodeId, !node?.pinned);
          activeDragTargetId.current = null;
        }
        isPanning.current = false;
      };

      const onWorldPanStart = (event: PIXI.FederatedPointerEvent) => {
        if (event.target === world || event.button === 1) {
          isPanning.current = true;
          lastPanPoint.current.copyFrom(event.global);
        }
      };

      world.eventMode = "static";
      world.hitArea = new PIXI.Rectangle(-100000, -100000, 200000, 200000);
      world.on("pointerdown", onWorldPanStart);

      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.stage.on('pointermove', onPointerMove);
      app.stage.on('pointerup', onPointerUpGlobal);
      app.stage.on('pointerupoutside', onPointerUpGlobal);
      
      setIsInitialized(true);
    };

    init();

    return () => {
      isCancelled = true;
      // Robust cleanup for React 18 StrictMode.
      // This ensures that on unmount/remount, the state is completely reset.
      container.removeEventListener('wheel', handleZoom);
      stopSimulation();
      
      // The second argument to destroy removes the canvas from the DOM.
      appRef.current?.destroy(true, true);
      appRef.current = null;

      // Reset all refs to ensure a clean slate for re-initialization.
      worldRef.current = null;
      nodesContainerRef.current = null;
      linksContainerRef.current = null;
      pixiNodes.current.clear();
      pixiLinks.current.clear();
      pinSvgDataRef.current = null;
      
      // Reset component state.
      setIsInitialized(false);
    };
  }, []);

  // Effect to manage nodes
  useEffect(() => {
    if (!isInitialized || !nodesContainerRef.current || !pinSvgDataRef.current) return;

    const nodesContainer = nodesContainerRef.current;
    const currentPixiNodeIds = Array.from(pixiNodes.current.keys());
    const storeNodeIds = nodes.map(n => n.id);

    // Remove old nodes
    currentPixiNodeIds.forEach(id => {
      if (!storeNodeIds.includes(id)) {
        const pixiNode = pixiNodes.current.get(id);
        if (pixiNode) {
          nodesContainer.removeChild(pixiNode);
          pixiNode.destroy();
          pixiNodes.current.delete(id);
        }
      }
    });

    // Add or update nodes
    nodes.forEach(nodeData => {
      let pixiNode = pixiNodes.current.get(nodeData.id);
      if (!pixiNode) {
        // Add new node
        const nodeContainer = drawNode(nodeData, handlePinToggle, pinSvgDataRef.current!);
        nodeContainer.on("pointerdown", onNodeDragStart);
        nodeContainer.on("rightdown", onNodeRightClick);
        
        const worldPoint = new PIXI.Point(window.innerWidth / 2, window.innerHeight / 2);
        const localPoint = worldRef.current!.toLocal(worldPoint);
        nodeData.x = nodeData.x ?? localPoint.x;
        nodeData.y = nodeData.y ?? localPoint.y;
        nodeContainer.x = nodeData.x;
        nodeContainer.y = nodeData.y;

        nodesContainer.addChild(nodeContainer);
        pixiNodes.current.set(nodeData.id, nodeContainer);
      } else {
        // Update existing node
        const text = pixiNode.getChildAt(1) as PIXI.Text | undefined;
        if (text && text.text !== nodeData.label) {
          text.text = nodeData.label;
        }
        if ((pixiNode as any).updatePin) {
          (pixiNode as any).updatePin(!!nodeData.pinned);
        }
      }
    });

    updateSimulationNodes(nodes);
  }, [isInitialized, nodes, handlePinToggle, onNodeDragStart, onNodeRightClick]);

  // Effect to manage links
  useEffect(() => {
    if (!isInitialized || !linksContainerRef.current) return;

    const linksContainer = linksContainerRef.current;
    const currentPixiLinkIds = Array.from(pixiLinks.current.keys());
    const storeLinkIds = links.map(l => l.id);

    // Remove old links
    currentPixiLinkIds.forEach(id => {
      if (!storeLinkIds.includes(id)) {
        const pixiLink = pixiLinks.current.get(id);
        if (pixiLink) {
          linksContainer.removeChild(pixiLink);
          pixiLink.destroy();
          pixiLinks.current.delete(id);
        }
      }
    });

    // Add new links
    links.forEach(linkData => {
      if (!pixiLinks.current.has(linkData.id)) {
        const linkGfx = new PIXI.Graphics();
        linksContainer.addChild(linkGfx);
        pixiLinks.current.set(linkData.id, linkGfx);
      }
    });
    updateSimulationLinks(links);
  }, [isInitialized, links]);

  // Effect to update node visibility when renaming
  useEffect(() => {
    pixiNodes.current.forEach((nodeContainer, nodeId) => {
      const isRenaming = nodeId === renamingNodeId;
      const text = nodeContainer.getChildAt(1) as PIXI.Text | undefined;
      if (text) {
        text.visible = !isRenaming;
      }
    });
  }, [renamingNodeId]);

  // Effect to handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (appRef.current) {
        updateSimulationCenter(appRef.current.screen.width, appRef.current.screen.height);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { appRef, zoom, centerView, fitView };
};
