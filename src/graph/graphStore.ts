import { create } from "zustand";

export interface Node {
  id: string;
  label: string;
}

export interface Link {
  id: string;
  source: string; // ID-ul nodului sursă
  target: string; // ID-ul nodului destinație
}

interface GraphState {
  nodes: Node[];
  links: Link[];
}

// Date de test cu label-uri de diverse lungimi pentru a testa toate cazurile
const initialNodes: Node[] = [
  { id: "1", label: "Start" }, // Caz minim, 1 rând
  { id: "2", label: "Analiza Inițială a Cerințelor" }, // 2 rânduri
  { id: "3", label: "Design Arhitectural și Prototipare Interfață Utilizator" }, // 3 rânduri
  { id: "4", label: "Dezvoltarea backend-ului cu microservicii, integrarea bazei de date și implementarea logicii de business complexe" }, // Va fi trunchiat cu "..."
  { id: "5", label: "Testare QA" }, // 1 rând
  { id: "6", label: "Revizuire și Feedback Client" }, // 2 rânduri
  { id: "7", label: "Deployment" }, // Caz minim, 1 rând
];

const initialLinks: Link[] = [
  { id: "l1", source: "1", target: "2" },
  { id: "l2", source: "2", target: "3" },
  { id: "l3", source: "2", target: "5" },
  { id: "l4", source: "3", target: "4" },
  { id: "l5", source: "4", target: "6" },
  { id: "l6", source: "5", target: "6" },
  { id: "l7", source: "6", target: "7" },
];

export const useGraphStore = create<GraphState>(() => ({
  nodes: initialNodes,
  links: initialLinks,
}));
