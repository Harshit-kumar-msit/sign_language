import React from "react";

const About = () => (
  <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 via-white to-gray-100 px-4 py-16">
    <section className="max-w-2xl w-full text-center bg-white/80 backdrop-blur-sm shadow-md rounded-2xl p-8 border border-gray-200">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-gray-800 tracking-tight">
        What{" "}
        <span className="bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          SignAI
        </span>{" "}
        Can Do
      </h1>

      <p className="text-lg md:text-xl text-gray-700 mb-8 font-medium leading-relaxed">
        <span className="font-bold text-gray-800">SignAI</span> is an AI-powered
        platform that recognizes sign language gestures and facial emotions in
        real time, making communication more inclusive and effortless.
      </p>

      <ul className="grid gap-4 text-left mb-10 mx-auto max-w-md list-disc list-inside text-gray-700">
        <li>
          <span className="font-semibold text-gray-800">Real-time</span> sign
          language gesture recognition using your webcam
        </li>
        <li>
          <span className="font-semibold text-gray-800">Facial emotion</span>{" "}
          detection for richer communication context
        </li>
        <li>
          <span className="font-semibold text-gray-800">Instant audio</span>{" "}
          feedback for spoken translation
        </li>
        <li>
          <span className="font-semibold text-gray-800">Modern</span>, secure,
          and privacy-friendly web experience
        </li>
      </ul>

      <div className="flex items-center justify-center gap-2 text-base text-gray-600">
        Built with{" "}
        <span className="font-semibold text-gray-800">Python</span> (Backend)
        &nbsp;and&nbsp;
        <span className="font-semibold text-gray-800">React</span> (Frontend)
      </div>
    </section>
  </main>
);

export default About;
