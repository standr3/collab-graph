import { useGraphStore } from "../store";

export const ContextMenu = () => {
  const { contextMenu, deleteNode, startRenamingNode } = useGraphStore();

  if (!contextMenu) return null;

  const handleDelete = () => {
    deleteNode(contextMenu.nodeId);
    startRenamingNode(null); // Close context menu
  };

  const handleRename = () => {
    startRenamingNode(contextMenu.nodeId);
  };

  return (
    <div
      className="absolute bg-white border border-gray-200 rounded-md shadow-lg z-10"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <ul>
        <li
          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
          onClick={handleDelete}
        >
          Delete
        </li>
        <li
          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
          onClick={handleRename}
        >
          Rename
        </li>
      </ul>
    </div>
  );
};
