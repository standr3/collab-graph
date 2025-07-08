import React from 'react';

const Toolbar: React.FC<{
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterView: () => void;
  onFitView: () => void;
}> = ({ onZoomIn, onZoomOut, onCenterView, onFitView }) => {
  return (
    <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-80 p-2 rounded-lg shadow-lg flex flex-col space-y-2 z-10">
      <button onClick={onZoomIn} title="Zoom In" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">
        ➕
      </button>
      <button onClick={onZoomOut} title="Zoom Out" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">
        ➖
      </button>
      <button onClick={onCenterView} title="Centrează Vederea" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">
        🎯
      </button>
      <button onClick={onFitView} title="Încadrează Vederea" className="p-2 bg-gray-700 hover:bg-blue-500 rounded transition-colors text-white">
        🖼️
      </button>
    </div>
  );
};

export default Toolbar;
