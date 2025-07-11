# Collab Graph

An interactive graph visualization tool built with React and PixiJS. This project explores performant rendering of complex, physics-based graph structures and the implementation of intuitive user interactions. It serves as a solid foundation for applications like concept mapping, data visualization, and collaborative diagramming.

## Live Demo
A live demo is available here: [collab-graph-beige.vercel.app](https://collab-graph-beige.vercel.app/)

## Technical Architecture

This project is built on a decoupled architecture where each library has a distinct role. The data flows in a one-way loop, preventing complex dependencies and ensuring clear separation of concerns.

1.  **React & Zustand (State & UI):** React orchestrates the application and manages UI components like menus and dialogs. The core graph data (`nodes` and `links`) is held in a centralized **Zustand** store. This decouples the graph state from React's lifecycle, allowing other modules to interact with it directly.

2.  **d3-force (Physics & Layout):** The simulation engine runs independently, taking the graph data from the Zustand store as its input. It continuously calculates node positions and mutates the state objects directly. This approach is highly performant as it avoids triggering React re-renders on every simulation tick.

3.  **PixiJS (Rendering):** The rendering layer is managed within a custom `usePixi` React hook. It listens for the `d3-force` simulation ticks and reads the updated node positions from the state to render the graph on a WebGL-powered canvas. This ensures the visuals are always in sync with the physics simulation without being directly controlled by it.

## Key Implementations

This section details features and solutions built on top of the core libraries.

- **State-Driven Physics Integration:** The connection between `d3-force` and the application is managed by a tick-based callback system. The simulation is the "source of truth" for node positions, and the `usePixi` hook acts as a passive listener, updating the rendering accordingly. This avoids performance bottlenecks common in state-driven animations.

- **Custom Adaptive Link Rendering:** The logic for drawing links is entirely custom-built to enhance clarity and aesthetics. Instead of simple straight lines, this system calculates link geometry based on multiple factors:
  - **Topology:** Links curve automatically to avoid overlapping when multiple connections exist between the same two nodes.
  - **Graph Geometry:** The curvature direction is determined by the link's position relative to the graph's overall center, creating an organic, outward flow.
  - **Proximity & Angle:** The curve's magnitude adapts based on node distance and angle, transitioning smoothly to straight lines for closely-packed or collinear nodes.
  - **Tangent-Aligned Arrowheads:** Arrowheads on curved links are dynamically rotated to align with the curve's tangent, ensuring they are always visually correct.

- **Coordinated Event System:** A unified event system manages pointer interactions. This prevents conflicts between distinct actions like dragging a node (a PIXI object event) and panning the background (a stage event), ensuring a predictable and bug-free user experience.

- **Polished Camera Animations:** While `d3-force` handles the graph's physics, **GSAP** is used to create smooth, intentional camera animations for actions like zooming and centering the view. This separates user-driven navigation from the physics simulation, resulting in a more controlled and polished feel.

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
