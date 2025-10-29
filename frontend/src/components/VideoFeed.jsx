import React, { useRef, useEffect } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

const VideoFeed = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      try {
        // Load Mediapipe model
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          },
          numHands: 1,
          runningMode: "VIDEO",
        });

        handLandmarkerRef.current = handLandmarker;

        // Start webcam
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = videoRef.current;
        video.srcObject = stream;

        video.onloadedmetadata = () => {
          video.play();
          animationRef.current = requestAnimationFrame(renderLoop);
        };
      } catch (err) {
        console.error("Error initializing camera or model:", err);
      }
    };

    const renderLoop = async () => {
      if (!isActive || !videoRef.current || !handLandmarkerRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Wait for video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        animationRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      try {
        const results = await handLandmarkerRef.current.detectForVideo(
          video,
          performance.now()
        );

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (results.landmarks?.length) {
          const drawingUtils = new DrawingUtils(ctx);

          results.landmarks.forEach((landmarks) => {
            // Draw connectors and landmarks
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
              color: "#00FFAA",
              lineWidth: 3,
            });
            drawingUtils.drawLandmarks(landmarks, {
              color: "#FF006E",
              radius: 4,
            });
          });
        }

        ctx.restore();
      } catch (err) {
        console.warn("Frame skipped due to detection error:", err.message);
      }

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    init();

    return () => {
      isActive = false;
      cancelAnimationFrame(animationRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }} // Mirror for natural hand orientation
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ transform: "scaleX(-1)" }}
      />
    </div>
  );
};

export default VideoFeed;
