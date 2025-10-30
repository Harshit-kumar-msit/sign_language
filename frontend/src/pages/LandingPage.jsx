import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Info } from "lucide-react";

const LandingPage = () => {
  const landingPageRef = useRef(null);
  const ballRef1 = useRef(null);
  const ballRef2 = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let animationFrame;
    let mouse = { x: 0, y: 0 };

    const handleMouseMove = (e) => {
      if (!landingPageRef.current) return;
      const rect = landingPageRef.current.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width - 0.5;
      mouse.y = (e.clientY - rect.top) / rect.height - 0.5;
    };

    const animate = () => {
      if (ballRef1.current && ballRef2.current) {
        ballRef1.current.style.transform = `translate3d(${-mouse.x * 50}px, ${
          -mouse.y * 50
        }px, 0) scale(1.06)`;
        ballRef2.current.style.transform = `translate3d(${-mouse.x * 80}px, ${
          -mouse.y * 80
        }px, 0) scale(1.08)`;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationFrame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      ref={landingPageRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-linear-to-br from-gray-50 via-white to-gray-100"
    >
            <div
              ref={ballRef1}
              aria-hidden="true"
              className="absolute z-0 rounded-full opacity-40 blur-2xl pointer-events-none transition-transform duration-700
                         w-34 h-34 md:w-[360px] md:h-[360px] lg:w-[480px] lg:h-[480px]
                         -top-[1] -left-12 md:-top-40 md:-left-40 lg:-top-64 lg:-left-64"
              style={{ filter: "drop-shadow(0 0 60px rgba(120,120,120,0.25))", background: "linear-gradient(135deg,#9ca3af,#d1d5db)" }}
            />
      
            <div
              ref={ballRef2}
              aria-hidden="true"
              className="absolute z-0 rounded-full opacity-40 blur-2xl pointer-events-none transition-transform duration-700
                         w-28 h-28 md:w-[300px] md:h-[300px] lg:w-[400px] lg:h-[400px]
                         -bottom-1 -right-8 md:-bottom-32 md:-right-32 lg:-bottom-48 lg:-right-48"
              style={{ filter: "drop-shadow(0 0 40px rgba(120,120,120,0.25))", background: "linear-gradient(135deg,#cbd5e1,#e5e7eb)" }}
            />

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-gray-400 rounded-full opacity-40 animate-float" />
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-gray-300 rounded-full opacity-30 animate-float-delayed" />
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-gray-400 rounded-full opacity-40 animate-float-slow" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-24 md:py-16 w-full max-w-4xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/80 backdrop-blur-sm shadow-md border border-gray-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-600" />
          </span>
          <span className="text-sm font-medium text-gray-700">
            AI-Powered Translation
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
          <span className="block bg-linear-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Welcome to
          </span>
          <span className="block bg-linear-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent pb-2">
            SignAI
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 font-medium mb-12 max-w-2xl leading-relaxed">
          Break communication barriers with real-time AI-powered sign language
          translation
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto">
          <button
            aria-label="Get started"
            onClick={() => navigate("/compare")}
            className="group relative inline-flex items-center gap-3 px-8 py-3 md:px-6 md:py-2 rounded-full bg-linear-to-r from-gray-800 to-gray-600 text-white font-semibold text-lg shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
          >
            <ArrowRight className="w-5 h-5 -ml-0.5" />
            <span className="px-1">Get Started</span>
          </button>

          <button
            aria-label="Learn more"
            onClick={() => navigate("/instructions")}
            className="inline-flex items-center gap-3 px-4 py-3 md:px-6 md:py-2 rounded-full bg-white border border-gray-200 text-gray-800 font-semibold text-lg shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-200"
          >
            <Info className="w-5 h-5 opacity-90" />
            <span>Learn More</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
