import React, { useRef, useEffect, useState } from "react";
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
  const framesBufferRef = useRef([]);
  const TARGET_FRAMES = 8; // must match backend/train
  const [prediction, setPrediction] = useState(null);
  const recentPredsRef = useRef([]);
  const SMOOTH_WINDOW = 5; // majority vote window
  const CONF_THRESH = 0.35; // ignore low-confidence predictions

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

          // extract flattened features for up to 2 hands (21 landmarks each, x,y,z)
          const frameFeat = getFrameFeatures(results.landmarks);
          // push into circular buffer
          framesBufferRef.current.push(frameFeat);
          if (framesBufferRef.current.length >= TARGET_FRAMES) {
            // copy next sequence
            const seq = framesBufferRef.current.slice(-TARGET_FRAMES);
            // send to backend (don't await to avoid blocking render)
            sendSequence(seq).then((res) => {
              if (res && res.label) {
                // smoothing: accept only confident predictions, then majority vote
                if ((res.confidence || 0) >= CONF_THRESH) {
                  recentPredsRef.current.push(res.label);
                  if (recentPredsRef.current.length > SMOOTH_WINDOW) recentPredsRef.current.shift();
                  // compute majority
                  const counts = {};
                  for (const p of recentPredsRef.current) counts[p] = (counts[p] || 0) + 1;
                  let best = null; let bestc = 0;
                  for (const k of Object.keys(counts)) {
                    if (counts[k] > bestc) { best = k; bestc = counts[k]; }
                  }
                  setPrediction({ label: best, confidence: res.confidence, raw: res });
                } else {
                  // low confidence: keep previous prediction but shrink history
                  recentPredsRef.current = recentPredsRef.current.slice(-Math.floor(SMOOTH_WINDOW/2));
                }
              }
            }).catch((e) => console.warn('predict error', e));
            // keep buffer (sliding window) - drop oldest to keep size manageable
            if (framesBufferRef.current.length > TARGET_FRAMES * 3) {
              framesBufferRef.current = framesBufferRef.current.slice(-TARGET_FRAMES * 2);
            }
          }
        }
      } catch (err) {
        console.warn("Frame skipped due to detection error:", err?.message || err);
      }

      animationRef.current = requestAnimationFrame(renderLoop);
      captured.raf = animationRef.current;
    };

    // build per-frame feature vector (two hands, 21 landmarks each, x,y,z => 126 dims)
    const getFrameFeatures = (landmarksArray) => {
      const feat = new Array(21 * 3 * 2).fill(0);
      // landmarksArray is an array of hands; place first hand at slot 0, second at slot 1
      for (let h = 0; h < Math.min(2, landmarksArray.length); h++) {
        const lmArr = landmarksArray[h];
        const base = h * 21 * 3;
        for (let i = 0; i < Math.min(21, lmArr.length); i++) {
          const lm = lmArr[i];
          // some landmarks may be objects with x,y,z
          feat[base + i * 3 + 0] = lm.x ?? 0;
          feat[base + i * 3 + 1] = lm.y ?? 0;
          feat[base + i * 3 + 2] = lm.z ?? 0;
        }
      }
      return feat;
    };

    const sendSequence = async (sequence) => {
      try {
        const res = await fetch('http://localhost:5000/api/predict_kp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequence }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'server error');
        }
        return await res.json();
      } catch (e) {
        console.warn('sendSequence failed', e);
        return null;
      }
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
      {/* prediction overlay */}
      {prediction && (
        <div style={{ position: 'absolute', right: 12, top: 12, background: 'rgba(255,255,255,0.85)', padding: '8px 12px', borderRadius: 12 }}>
          <div style={{ fontWeight: 700, color: '#111' }}>{prediction.label}</div>
          <div style={{ fontSize: 12, color: '#333' }}>Conf: {(prediction.confidence || 0).toFixed(2)}</div>
        </div>
      )}
    </div>
  );
};

export default VideoFeed;