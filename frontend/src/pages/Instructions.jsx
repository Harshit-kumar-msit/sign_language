import React from "react";

const Instructions = () => (
  <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-gray-100 px-4 py-16">
    <section className="max-w-2xl w-full text-center bg-white/80 backdrop-blur-sm shadow-md rounded-2xl p-8 border border-gray-200">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-gray-800 tracking-tight">
        How to Use{" "}
        <span className="bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          SignAI
        </span>
      </h1>

      <ol className="list-decimal list-inside text-left mx-auto max-w-md text-lg text-gray-700 mb-8 space-y-3">
        <li>
          Click{" "}
          <span className="font-semibold text-gray-800">Get Started</span> on
          the landing page or navigate to the{" "}
          <span className="font-semibold text-gray-800">Compare</span> page.
        </li>
        <li>Allow camera access when prompted by your browser.</li>
        <li>
          Show your sign language gesture clearly in front of your webcam.
        </li>
        <li>
          Wait for the AI models (<span className="font-semibold">LSTM</span> &
          <span className="font-semibold"> CNN</span>) to process and display
          the recognized text.
        </li>
        <li>Compare the results from both models side by side.</li>
      </ol>

      <p className="text-gray-600 font-medium leading-relaxed">
        For best results, ensure good lighting and keep your hand gestures fully
        visible within the camera frame.
      </p>
    </section>
  </main>
);

export default Instructions;
