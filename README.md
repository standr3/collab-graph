# Collab Graph

An interactive graph visualization tool built with React and PixiJS. This project explores performant rendering of complex, physics-based graph structures and the implementation of intuitive user interactions. It serves as a solid foundation for applications like concept mapping, data visualization, and collaborative diagramming.

## Live Demo
A live demo is available here: [collab-graph-beige.vercel.app](https://collab-graph-beige.vercel.app/)

## Key Features

- **Interactive Physics Simulation:** Utilizes `d3-force` to create a dynamic layout where nodes organically arrange themselves. Users can directly influence the simulation by dragging nodes, which seamlessly reintegrate into the physics-based layout upon release.

- **Performant WebGL Rendering:** Employs PixiJS for hardware-accelerated rendering, ensuring smooth interactions. Text quality is preserved at all zoom levels through dynamic resolution scaling, maintaining clarity.

- **Fluid Camera Controls:** Features intuitive scene navigation via background panning and cursor-centered zooming, inspired by modern mapping applications.

- **Adaptive Link Curvature:** A dynamic link rendering system designed to enhance graph readability and aesthetics.
  - Links automatically curve to avoid overlapping when multiple connections exist between the same two nodes.
  - Curvature direction is determined by the link's position relative to the graph's center, creating an organic, outward flow.
  - The curve's magnitude adapts based on node distance and its angle to the graph's center, transitioning smoothly to straight lines for closely-packed or collinear nodes.

- **In-Canvas UI:** Includes a right-click context menu for node interactions like renaming and deletion, managed within the PixiJS scene.

## Tech Stack

- **Frontend:** React, TypeScript
- **Rendering:** PixiJS v8
- **State Management:** Zustand
- **Physics:** d3-force
- **Animation:** GSAP
- **Build Tool:** Vite

## Setup

```bash
npm install
npm run dev
```

## Future Development

- **Undo/Redo Functionality:** Leveraging the centralized state for robust action history.
- **Performance for Large Graphs:** Implementing viewport culling to render only visible objects.
- **Save/Load Graph State:** Adding serialization for graph persistence.
- **Real-time Collaboration:** Exploring options for a multi-user experience.
