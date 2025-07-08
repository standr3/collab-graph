import React from 'react';

const StatsPanel: React.FC<{ fps: number }> = ({ fps }) => {
  return (
    <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-70 p-3 rounded-lg shadow-lg text-white text-xs font-mono z-10">
      <div>FPS: {fps.toFixed(1)}</div>
    </div>
  );
};

export default StatsPanel;
