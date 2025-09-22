
import React, { useState, useCallback } from 'react';
import StickFigureCanvas from './components/StickFigureCanvas';
import Controls from './components/Controls';
import type { PoseData } from './types';
import { INITIAL_POSE_DATA } from './constants';


const App: React.FC = () => {
  const [poseData, setPoseData] = useState<PoseData>(INITIAL_POSE_DATA);

  const handlePoseUpdate = useCallback((newPose: PoseData) => {
    setPoseData(newPose);
  }, []);

  const handlePoseUpload = useCallback((newPose: PoseData) => {
    // A more robust app might validate the newPose structure here
    setPoseData(newPose);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col md:flex-row font-sans">
      <header className="absolute top-0 left-0 w-full p-4 z-10 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
          3D Stick Figure Poser
        </h1>
        <p className="text-sm text-gray-400">Drag joints to pose the model. Use mouse wheel to zoom and right-click to pan.</p>
      </header>

      <div className="flex-grow w-full md:w-2/3 h-[50vh] md:h-screen">
        <StickFigureCanvas onPoseUpdate={handlePoseUpdate} pose={poseData} />
      </div>
      
      <div className="w-full md:w-1/3 h-[50vh] md:h-screen bg-gray-800 shadow-lg p-4 md:pt-24 overflow-y-auto">
        <Controls poseData={poseData} onPoseUpload={handlePoseUpload} />
      </div>
    </div>
  );
};

export default App;
