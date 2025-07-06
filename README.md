# 🧠 Collab Graph

An interactive graph visualization demo built with React and PixiJS. Started as a thesis project that I wanted to make actually fast and usable by modern standards.

## 🎯 What it does

Interactive graph visualization demo where you can drag nodes around and explore the scene. Originally planned for educational concept mapping, but right now it's a solid foundation for graph interactions.

## 🎮 Live Demo
Check out the current demo [here](https://collab-graph-beige.vercel.app/).

## ⚙️ Tech Stack

- **React + TypeScript** – because types save lives
- **PixiJS v8** – hardware-accelerated 2D rendering that actually performs
- **Zustand** – lightweight state management
- **d3-force** – physics simulation for automatic node layouts
- **GSAP** – smooth animations
- **Vite** – fast development setup

## ✨ Current Features

**Dynamic Graph Rendering**
- Nodes and directed edges rendered on a managed canvas
- Smart edge connections that attach to node boundaries (not centers)
- Dynamic node sizing based on label length

**Advanced Interactions**
- Drag & drop individual nodes with physics integration
- Pan the entire scene (left-click on background or middle-click)
- Cursor-based zoom (Google Maps style)
- Smooth, frame-synced movement

**Physics-Based Layout**
- Automatic node arrangement using d3-force simulation
- Nodes find natural, balanced positions through attraction/repulsion forces
- Dragging temporarily overrides physics, releasing reintegrates nodes into simulation
- Graph stabilizes into readable, well-spaced configurations

**Visual Polish**
- Clean, modern color palette with subtle shadows
- High-contrast text that stays crisp at any zoom level
- Real-time FPS monitoring for performance tracking

**Performance Optimizations**
- Decoupled event handling from render loop
- Centralized pointer event management
- Smooth animations even during rapid gestures

**Modern Architecture**
- Clean separation of concerns across three modules
- Centralized state management with Zustand
- Isolated physics simulation service
- Pure rendering layer with PixiJS

## 🛠️ Technical Highlights

Some interesting problems I solved along the way:

- **Modular Architecture**: Transformed from monolithic component to clean separation of concerns:
  - `store.ts` - centralized state management
  - `logic.ts` - isolated physics simulation 
  - `Canvas.tsx` - pure rendering and interaction layer
- **Physics Integration**: Coordinated d3-force simulation with React state using callback-based updates, avoiding costly re-renders
- **Event Architecture**: Centralized all pointer events at the scene level to prevent conflicts between node dragging and scene panning
- **Smooth Movement**: Decoupled position updates from pointer events, using the render ticker instead for frame-synchronized movement
- **Precise Edge Rendering**: Implemented mathematical intersection calculations so edges connect cleanly to node boundaries
- **High-Quality Text**: Dynamic text resolution adjustment maintains crisp text at any zoom level

## 🎮 Try it

```bash
npm install
npm run dev
```

Drag nodes around, pan and zoom the scene. It's a demo, but the interactions feel smooth and the performance is solid.

## 🚀 What's Next

- **Node interactions** (double-click to edit labels)
- **Create/delete nodes and edges** directly in the interface
- **Performance optimizations** for larger graphs (viewport culling)
- **Save/load graph state** with proper serialization
- **Undo/Redo functionality** leveraging the centralized state
- **Collaborative features** (because why not?)

## 📝 Notes

This started as a thesis project that I wanted to modernize and make actually performant. Turned into a deep dive into canvas optimization, event handling, and building interactions that feel natural.