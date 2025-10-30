import React from "react";
import ModelResult from "./ModelResult";

const ModelComparison = ({ lstmResult, cnnResult }) => (
  <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-2">
    <ModelResult modelName="LSTM Model" result={lstmResult} color="text-gray-800" />
    <ModelResult modelName="CNN Model" result={cnnResult} color="text-gray-800" />
  </div>
);

export default ModelComparison;
