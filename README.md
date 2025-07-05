# 🧠 Collab Graph

An interactive graph visualization demo built with React and PixiJS.

## 🎯 What it does

Interactive graph visualization demo where you can drag nodes around and explore the scene. Originally planned for educational concept mapping, but right now it's a solid foundation for graph interactions.

## 🎮 Live Demo
Check out the current demo [here](https://collab-graph-beige.vercel.app/). It's a working visualization with smooth drag-and-drop, panning, and zoom interactions. The graph data is hardcoded for now, but all the core mechanics are there and running smoothly.

## ⚙️ Tech Stack

- **React + TypeScript** – because types save lives
- **PixiJS v8** – hardware-accelerated 2D rendering that actually performs
- **Zustand** – lightweight state management
- **GSAP** – smooth animations
- **Vite** – fast development setup

## ✨ Current Features

**Dynamic Graph Rendering**
- Nodes and directed edges rendered on a managed canvas
- Smart edge connections that attach to node boundaries (not centers)
- Dynamic node sizing based on label length

**Advanced Interactions**
- Drag & drop individual nodes
- Pan the entire scene (left-click on background or middle-click)
- Cursor-based zoom (Google Maps style)
- Smooth, frame-synced movement

**Visual Polish**
- Clean, modern color palette with subtle shadows
- High-contrast text that stays crisp at any zoom level
- Real-time FPS monitoring for performance tracking

**Performance Optimizations**
- Decoupled event handling from render loop
- Centralized pointer event management
- Smooth animations even during rapid gestures

## 🛠️ Technical Highlights

Some interesting problems I solved along the way:

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

- **d3-force integration** for automatic node layouts
- **Node interactions** (double-click to edit labels)
- **Create/delete nodes and edges** directly in the interface
- **Performance optimizations** for larger graphs (viewport culling)
- **Collaborative features**

## 📝 Notes

This started as a thesis project that I wanted to modernize and make actually performant. Turned into a deep dive into canvas optimization, event handling, and building interactions that feel natural.

Built with curiosity and a lot of Stack Overflow tabs open.