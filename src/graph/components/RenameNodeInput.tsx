import React, { useState, useEffect, useRef } from "react";
import { useGraphStore } from "../store";

export const RenameNodeInput: React.FC = () => {
  const {
    renamingNodeId,
    nodes,
    updateNodeLabel,
    startRenamingNode,
  } = useGraphStore();
  const nodeToRename = nodes.find((n) => n.id === renamingNodeId);
  const [label, setLabel] = useState(nodeToRename?.label || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nodeToRename) {
      setLabel(nodeToRename.label);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [nodeToRename]);

  if (!nodeToRename) return null;

  const handleBlur = () => {
    if (renamingNodeId) {
      updateNodeLabel(renamingNodeId, label);
    }
    startRenamingNode(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      startRenamingNode(null);
    }
  };

  const nodePosition = {
    top: (nodeToRename.y ?? 0) - (nodeToRename.height ?? 0) / 2,
    left: (nodeToRename.x ?? 0) - (nodeToRename.width ?? 0) / 2,
    width: nodeToRename.width,
    height: nodeToRename.height,
  };

  return (
    <div
      className="absolute"
      style={{
        top: nodePosition.top,
        left: nodePosition.left,
        width: nodePosition.width,
        height: nodePosition.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full text-center bg-white border border-blue-500 rounded-md"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};
