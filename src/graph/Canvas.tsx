import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

// PixiJS Drag & Drop Component
const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    const cleanup = () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };

    const initializePixi = async () => {
      if (!containerRef.current) return;

      const app = new PIXI.Application();

      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x2c3e50,
        antialias: true,
        resizeTo: window,
      });

      appRef.current = app;
      containerRef.current.appendChild(app.canvas);

      // Create container for draggable elements
      const dragContainer = new PIXI.Container();
      app.stage.addChild(dragContainer);

      // Drag state management
      let activeDragTarget: PIXI.Graphics | null = null;
      let dragOffset = { x: 0, y: 0 };

      // Configure stage for global pointer events
      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;
      app.stage.on("pointerup", handleDragEnd);
      app.stage.on("pointerupoutside", handleDragEnd);

      // Drag event handlers
      function handleDragStart(event: PIXI.FederatedPointerEvent) {
        const target = event.currentTarget as PIXI.Graphics;
        const localPosition = target.toLocal(event.global);

        dragOffset.x = localPosition.x;
        dragOffset.y = localPosition.y;
        activeDragTarget = target;

        // Visual feedback for active drag
        target.alpha = 0.8;
        target.scale.set(1.1);

        app.stage.on("pointermove", handleDragMove);
      }

      function handleDragMove(event: PIXI.FederatedPointerEvent) {
        if (!activeDragTarget) return;

        const globalPosition = activeDragTarget.parent.toLocal(event.global);
        activeDragTarget.x = globalPosition.x - dragOffset.x;
        activeDragTarget.y = globalPosition.y - dragOffset.y;
      }

      function handleDragEnd() {
        if (activeDragTarget) {
          app.stage.off("pointermove", handleDragMove);
          activeDragTarget.alpha = 1;
          activeDragTarget.scale.set(1);
          activeDragTarget = null;
        }
      }

      // Box configuration
      const boxColors = [
        0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xffeaa7, 0xdda0dd, 0xf0a500,
        0xff7675,
      ];
      const boxSize = 80;
      const totalBoxes = 12;
      const gridColumns = Math.floor(Math.sqrt(totalBoxes));
      const boxSpacing = 120;
      const gridStartX = (window.innerWidth - gridColumns * boxSpacing) / 2;
      const gridStartY =
        (window.innerHeight -
          Math.ceil(totalBoxes / gridColumns) * boxSpacing) /
        2;

      // Create draggable boxes
      for (let i = 0; i < totalBoxes; i++) {
        const box = new PIXI.Graphics();

        // Draw drop shadow
        box.rect(5, 5, boxSize, boxSize);
        box.fill({ color: 0x000000, alpha: 0.3 });

        // Draw main box
        box.rect(0, 0, boxSize, boxSize);
        box.fill(boxColors[i % boxColors.length]);

        // Draw border
        box.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
        box.rect(0, 0, boxSize, boxSize);

        // Position in grid with slight randomization
        const column = i % gridColumns;
        const row = Math.floor(i / gridColumns);
        box.x = gridStartX + column * boxSpacing + (Math.random() - 0.5) * 20;
        box.y = gridStartY + row * boxSpacing + (Math.random() - 0.5) * 20;

        // Configure interactivity
        box.eventMode = "static";
        box.cursor = "pointer";
        box.on("pointerdown", handleDragStart);
        box.on("pointerover", () => {
          if (activeDragTarget !== box) {
            box.scale.set(1.05);
            box.alpha = 0.9;
          }
        });
        box.on("pointerout", () => {
          if (activeDragTarget !== box) {
            box.scale.set(1);
            box.alpha = 1;
          }
        });

        dragContainer.addChild(box);
      }

      // Add subtle breathing animation
      let animationTime = 0;
      app.ticker.add(() => {
        animationTime += 0.01;
        dragContainer.children.forEach((child, index) => {
          if (child !== activeDragTarget) {
            const box = child as PIXI.Graphics;
            const breathingEffect =
              Math.sin(animationTime + index * 0.5) * 0.02;
            box.scale.set(1 + breathingEffect);
          }
        });
      });

      // Create title text
      const titleText = new PIXI.Text({
        text: "PixiJS Drag & Drop Demo",
        style: {
          fontFamily: "Arial",
          fontSize: 32,
          fill: 0xffffff,
          align: "center",
          fontWeight: "bold",
        },
      });
      titleText.anchor.set(0.5);
      titleText.x = window.innerWidth / 2;
      titleText.y = 50;
      app.stage.addChild(titleText);

      // Create instruction text
      const instructionText = new PIXI.Text({
        text: "Click and drag the boxes to move them around!",
        style: {
          fontFamily: "Arial",
          fontSize: 18,
          fill: 0xecf0f1,
          align: "center",
        },
      });
      instructionText.anchor.set(0.5);
      instructionText.x = window.innerWidth / 2;
      instructionText.y = 85;
      app.stage.addChild(instructionText);

      // Handle window resize
      const handleResize = () => {
        if (appRef.current) {
          appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
          titleText.x = window.innerWidth / 2;
          instructionText.x = window.innerWidth / 2;
        }
      };

      window.addEventListener("resize", handleResize);

      // Return cleanup function for resize listener
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    };

    initializePixi();
    return cleanup;
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default Canvas;
