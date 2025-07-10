import { useGraphStore } from "../store";

export const ContextMenu = () => {
  const { contextMenu, deleteNode, closeContextMenu } = useGraphStore();

  if (!contextMenu) return null;

  const handleDelete = () => {
    deleteNode(contextMenu.nodeId);
    closeContextMenu();
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
      </ul>
    </div>
  );
};
