# 🧠 Collab Graph

A collaborative graph editor built with React and PixiJS (work in progress)

## 🎯 Goal

The aim of this project is to build a collaborative web-based graph editor where multiple users (e.g. teachers and students) can create, move, and interact with nodes in real time. It’s primarily designed for educational concept maps and visual learning structures.

## ⚙️ Tech Stack

- **React** – UI rendering
- **PixiJS v8** – fast, hardware-accelerated 2D canvas rendering
- **Vite** – modern build tool for fast development
- **TypeScript** – static typing for maintainable code
- **TailwindCSS** – utility-first styling (to be added soon)
- **D3 (planned)** – for force-directed layouts

## ✅ Current Progress

- [x] Vite + React + TypeScript setup
- [x] Integrated PixiJS v8 in React with proper cleanup and resizing
- [x] Created interactive draggable boxes (graph nodes)
- [ ] Coming up: edges, forces, and centralized state management

## 📌 Next Steps

- [ ] Connect nodes with lines (edges)
- [ ] Add D3-style force simulation layout
- [ ] Introduce a global store (Zustand or Redux)
- [ ] User authentication and role-based permissions
- [ ] Export/import graphs
- [ ] Collaboration features (WebSocket / CRDT)

## 🙋‍♂️ Author

Built by Andrei as a learning exercise in React canvas rendering, PixiJS, and UI for educational tools.
