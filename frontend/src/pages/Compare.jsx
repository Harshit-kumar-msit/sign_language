// ...existing code...
import React, { useState, useEffect } from "react";
import VideoFeed from "../components/VideoFeed";
import ModelComparison from "../components/ModelComparison";
import Loader from "../components/Loader";

const mockPredict = () => ({
  lstm: "Hello (LSTM)",
  cnn: "Hello (CNN)",
});

const Compare = () => {
  const [lstmResult, setLstmResult] = useState("");
  const [cnnResult, setCnnResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);

  useEffect(() => {
    let mounted = true;
    let permissionStatus = null;

    const checkCameraPermission = async () => {
      try {
        if (!navigator.permissions) {
          // Permissions API not available — let VideoFeed request access when mounted
          return;
        }

        permissionStatus = await navigator.permissions.query({ name: "camera" });
        if (!mounted) return;
        setCameraReady(permissionStatus.state === "granted");
        setCameraDenied(permissionStatus.state === "denied");

        permissionStatus.onchange = () => {
          if (!mounted) return;
          setCameraReady(permissionStatus.state === "granted");
          setCameraDenied(permissionStatus.state === "denied");
        };
      } catch (err) {
        console.warn("Camera permission check failed:", err);
      }
    };

    checkCameraPermission();

    return () => {
      mounted = false;
      if (permissionStatus) {
        try {
          permissionStatus.onchange = null;
        } catch(e) {console.error(e)}
        permissionStatus = null;
      }
    };
  }, []);

  // Mock prediction updates
  useEffect(() => {
    setLoading(true);
    const interval = setInterval(() => {
      const { lstm, cnn } = mockPredict();
      setLstmResult(lstm);
      setCnnResult(cnn);
      setLoading(false);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-100 via-gray-200 to-gray-300 py-12 px-4">
      <section className="max-w-6xl w-full text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-gray-800 tracking-tight pt-10">
          Sign Language <span className="text-gray-600">Model Comparison</span>
        </h1>

        <div className="flex flex-col items-center justify-center bg-white/60 backdrop-blur-lg border border-gray-300 rounded-3xl shadow-md p-6 md:p-8 mb-10 transition-all hover:shadow-lg">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-gray-400 shadow-inner">
            {cameraDenied ? (
              <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-600 text-lg font-medium">
                Camera access denied. Please enable it in your browser settings.
              </div>
            ) : (
              // Let VideoFeed request and own the camera stream
              <VideoFeed />
            )}
          </div>
          <p className="mt-4 text-gray-700 text-sm md:text-base">
            Keep your hands visible and ensure proper lighting for best results.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center mt-10">
            <Loader />
          </div>
        ) : (
          <ModelComparison lstmResult={lstmResult} cnnResult={cnnResult} />
        )}

        <p className="text-gray-600 mt-10 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Both <span className="font-semibold text-gray-800">LSTM</span> and{" "}
          <span className="font-semibold text-gray-800">CNN</span> models analyze your gestures
          in real time to interpret sign language. This comparison helps visualize how
          each model perceives gestures differently.
        </p>
      </section>
    </main>
  );
};

export default Compare;
// ...existing code...