
import React, { useRef } from 'react';
import type { PoseData } from '../types';

interface ControlsProps {
  poseData: PoseData;
  onPoseUpload: (pose: PoseData) => void;
}

const Controls: React.FC<ControlsProps> = ({ poseData, onPoseUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const newPose = JSON.parse(text);
          onPoseUpload(newPose);
        }
      } catch (error) {
        console.error("Error parsing JSON file:", error);
        alert("Invalid or corrupted JSON file.");
      }
    };
    reader.readAsText(file);
    // Reset the input value to allow uploading the same file again
    event.target.value = '';
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-cyan-300">Pose Data (degrees)</h2>
      <div className="flex-grow bg-gray-900 rounded-lg p-4 overflow-auto shadow-inner">
        <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap">
          <code>{JSON.stringify(poseData, null, 2)}</code>
        </pre>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/json"
        className="hidden"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleUploadClick}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-75 shadow-md"
        >
          Upload JSON
        </button>
        <button
          onClick={handleDownload}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 shadow-md"
        >
          Download JSON
        </button>
      </div>
    </div>
  );
};

export default Controls;
