import React from "react";

const ModelResult = ({ modelName, result, color }) => (
  <div className="flex flex-col justify-center items-center bg-white/70 backdrop-blur-lg border border-gray-300 rounded-2xl shadow-md w-full min-h-[120px] p-6 transition-all hover:shadow-lg">
    <h2 className={`text-xl font-semibold mb-2 ${color}`}>{modelName}</h2>
    <p className="text-lg text-gray-700 font-medium">
      {result || "Waiting..."}
    </p>
  </div>
);

export default ModelResult;
