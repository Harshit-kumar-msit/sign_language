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
  const streamRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    const captured = {
      video: null,
      canvas: null,
      stream: null,
      hand: null,
      raf: null,
    };

    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          },
          numHands: 2,
          runningMode: "VIDEO",
        });

        handLandmarkerRef.current = handLandmarker;
        captured.hand = handLandmarkerRef.current;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!isActive) {
          // if component unmounted while awaiting permission, stop immediately
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        captured.stream = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          captured.video = video;
        }

        video.onloadedmetadata = () => {

          video.play();
          animationRef.current = requestAnimationFrame(renderLoop);
          captured.raf = animationRef.current;
          captured.canvas = canvasRef.current;
        };
      } catch (err) {
        console.error("Error initializing camera or model:", err);
      }
    };

    const renderLoop = async () => {
      if (!isActive || !videoRef.current || !handLandmarkerRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        animationRef.current = requestAnimationFrame(renderLoop);
        captured.raf = animationRef.current;
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

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (results.landmarks?.length) {
          const drawingUtils = new DrawingUtils(ctx);
          results.landmarks.forEach((landmarks) => {
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
      } catch (err) {
        console.warn("Frame skipped due to detection error:", err?.message || err);
      }

      animationRef.current = requestAnimationFrame(renderLoop);
      captured.raf = animationRef.current;
    };

    init();

    return () => {
      // use captured stable references instead of reading ref.current directly
      const videoEl = captured.video;
      const canvasEl = captured.canvas;
      const stream = captured.stream || streamRef.current;
      const hand = captured.hand || handLandmarkerRef.current;
      const rafId = captured.raf || animationRef.current;

      console.log("Cleaning up VideoFeed...");
      isActive = false;
      try {
        if (rafId) cancelAnimationFrame(rafId);
      } catch (e) {
        console.error(e);
      }

      if (stream) {
        try {
          stream.getTracks().forEach((t) => t.stop());
          console.log("Camera stream stopped");
        } catch (e) {
          console.warn("Failed to stop tracks:", e);
        }
        if (videoEl) videoEl.srcObject = null;
        streamRef.current = null;
      } else if (videoEl?.srcObject) {
        try {
          videoEl.srcObject.getTracks().forEach((t) => t.stop());
        } catch (e) {
          console.warn("Failed to stop fallback tracks:", e);
        }
        videoEl.srcObject = null;
      }

      if (videoEl) {
        try {
          videoEl.pause();
        } catch(e) {console.error(e)}
        videoEl.srcObject = null;
      }

      if (canvasEl) {
        try {
          const ctx = canvasEl.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        } catch(e) {console.error(e)}
      }

      if (hand) {
        if (typeof hand.close === "function") {
          try {
            hand.close();
          } catch(e) {console.error(e)}
        } else if (typeof hand.dispose === "function") {
          try {
            hand.dispose();
          } catch(e) {console.error(e)}
        }
        handLandmarkerRef.current = null;
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
        style={{ transform: "scaleX(-1)" }}
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