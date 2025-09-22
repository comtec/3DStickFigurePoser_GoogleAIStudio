
import React from 'react';
import type { PoseData } from '../types';

interface ControlsProps {
  poseData: PoseData;
}

const Controls: React.FC<ControlsProps> = ({ poseData }) => {
  const handleDownload = () => {
    const jsonString = JSON.stringify(poseData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stick-figure-pose.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-cyan-300">Pose Data (degrees)</h2>
      <div className="flex-grow bg-gray-900 rounded-lg p-4 overflow-auto shadow-inner">
        <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap">
          <code>{JSON.stringify(poseData, null, 2)}</code>
        </pre>
      </div>
      <button
        onClick={handleDownload}
        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 shadow-md"
      >
        Download JSON
      </button>
    </div>
  );
};

export default Controls;
