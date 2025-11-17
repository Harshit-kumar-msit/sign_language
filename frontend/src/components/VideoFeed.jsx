import React, { useRef, useEffect, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import JSConfetti from "js-confetti";
import LANGUAGES from "../utils/languages";

const VideoFeed = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);
  const framesBufferRef = useRef([]);
  const translateCacheRef = useRef({});
  const jsConfettiRef = useRef(null);
  
  const TARGET_FRAMES = 8;

  const [prediction, setPrediction] = useState(null);
  const [emotion, setEmotion] = useState(null);

  const recentPredsRef = useRef([]);
  const SMOOTH_WINDOW = 5;
  const CONF_THRESH = 0.35;

  const lastSpokenRef = useRef({ label: null, time: 0 });
  const SPEAK_COOLDOWN = 2000;

  const EMOTION_INTERVAL = 3000;
  const lastEmotionRef = useRef(0);

  const defaultLang =
    (typeof window !== "undefined" && localStorage.getItem("lang")) || "en";

  const [lang, setLang] = useState(defaultLang);

  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const fireEmoji = (emoji) => {
    if (!jsConfettiRef.current) return;

    jsConfettiRef.current.addConfetti({
      emojis: [emoji],
      emojiSize: 50,
      confettiNumber: 40,
    });
  };

  const getTagFor = (code) => {
    const entry = LANGUAGES.find(
      (l) => l.code === code || l.code.split("-")[0] === code
    );
    return entry?.tag || code;
  };

  // TRANSLATION
  const translateOnDemand = async (text, targetLang) => {
    if (!text) return text;
    const clean = text.trim();
    const key = `${targetLang}::${clean}`;

    if (translateCacheRef.current[key]) {
      return translateCacheRef.current[key];
    }

    try {
      const res = await fetch("http://localhost:5000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean, target: targetLang }),
      });

      if (!res.ok) return clean;

      const body = await res.json();
      const out = body.translation || clean;
      translateCacheRef.current[key] = out;
      return out;
    } catch {
      return clean;
    }
  };

  // TTS
  const speakText = (langCode, text) => {
    if (!text || !window.speechSynthesis) return;

    const now = performance.now();
    const last = lastSpokenRef.current;

    if (text === last.label && now - last.time < SPEAK_COOLDOWN) return;

    const targetTag = getTagFor(langCode);
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = targetTag;
    utter.rate = 1.0;

    const chooseVoice = () => {
      const voices = window.speechSynthesis.getVoices() || [];

      let voice =
        voices.find((v) => v.lang?.toLowerCase() === targetTag.toLowerCase()) ||
        voices.find((v) =>
          v.lang?.toLowerCase().startsWith(targetTag.split("-")[0])
        ) ||
        voices.find((v) => !/default/i.test(v.name)) ||
        voices[0];

      if (voice) utter.voice = voice;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);

      lastSpokenRef.current = { label: text, time: performance.now() };
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = chooseVoice;
    } else {
      chooseVoice();
    }
  };

  // MAIN INITIALIZER
  useEffect(() => {
    let isActive = true;
    const captured = {
      video: null,
      canvas: null,
      stream: null,
      hand: null,
      raf: null,
      emotionInterval: null,
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
        captured.hand = handLandmarker;

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!isActive) {
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
          try {
            video.play();
          } catch {}

          animationRef.current = requestAnimationFrame(renderLoop);
          captured.raf = animationRef.current;
          captured.canvas = canvasRef.current;

          jsConfettiRef.current = new JSConfetti({ canvas: canvasRef.current });
          captured.emotionInterval = setInterval(() => {
            captureAndSendEmotion(video);
          }, EMOTION_INTERVAL);
        };
      } catch (err) {
        console.error("Camera init failed:", err);
      }
    };

    const renderLoop = async () => {
      if (!isActive || !videoRef.current || !handLandmarkerRef.current) return;

      const currentLang = langRef.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!canvas || video.videoWidth === 0) {
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

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (results.landmarks?.length) {
          const drawingUtils = new DrawingUtils(ctx);

          results.landmarks.forEach((lm) => {
            drawingUtils.drawConnectors(lm, HandLandmarker.HAND_CONNECTIONS, {
              color: "#00FFAA",
              lineWidth: 3,
            });
            drawingUtils.drawLandmarks(lm, { color: "#FF006E", radius: 4 });
          });

          const frame = getFrameFeatures(results.landmarks);
          framesBufferRef.current.push(frame);

          if (framesBufferRef.current.length >= TARGET_FRAMES) {
            const seq = framesBufferRef.current.slice(-TARGET_FRAMES);

            sendSequence(seq).then(async (res) => {
              if (res && (res.label || res.label_id)) {
                if ((res.confidence || 0) >= CONF_THRESH) {
                  const labelKey = res.label_id ?? res.label;

                  recentPredsRef.current.push(labelKey);
                  if (recentPredsRef.current.length > SMOOTH_WINDOW)
                    recentPredsRef.current.shift();

                  const counts = {};
                  for (const id of recentPredsRef.current)
                    counts[id] = (counts[id] || 0) + 1;

                  let bestId = null;
                  let bestc = 0;
                  for (const k of Object.keys(counts)) {
                    if (counts[k] > bestc) {
                      bestId = k;
                      bestc = counts[k];
                    }
                  }

                  const rawServerLabel = res.label ?? bestId;

                  let display = rawServerLabel;
                  if (!currentLang.startsWith("en")) {
                    display = await translateOnDemand(rawServerLabel, currentLang);
                  }

                  setPrediction({
                    id: bestId,
                    label: display,
                    confidence: res.confidence,
                    raw: res,
                  });

                  speakText(currentLang, display);
                }
              }
            });

            if (framesBufferRef.current.length > TARGET_FRAMES * 3) {
              framesBufferRef.current = framesBufferRef.current.slice(
                -TARGET_FRAMES * 2
              );
            }
          }
        }
      } catch {}

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    const getFrameFeatures = (landmarksArray) => {
      const feat = new Array(21 * 3 * 2).fill(0);

      for (let h = 0; h < Math.min(2, landmarksArray.length); h++) {
        const lmArr = landmarksArray[h];
        const base = h * 21 * 3;
        for (let i = 0; i < Math.min(21, lmArr.length); i++) {
          const lm = lmArr[i];
          feat[base + i * 3] = lm.x ?? 0;
          feat[base + i * 3 + 1] = lm.y ?? 0;
          feat[base + i * 3 + 2] = lm.z ?? 0;
        }
      }
      return feat;
    };

    const sendSequence = async (sequence) => {
      try {
        const res = await fetch("http://localhost:5000/api/predict_kp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sequence }),
        });

        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    const captureAndSendEmotion = async (videoEl) => {
      try {
        if (!videoEl || videoEl.videoWidth === 0) return;

        const now = performance.now();
        if (now - lastEmotionRef.current < EMOTION_INTERVAL - 50) return;

        lastEmotionRef.current = now;

        const off = document.createElement("canvas");
        off.width = videoEl.videoWidth;
        off.height = videoEl.videoHeight;

        const ctx = off.getContext("2d");
        ctx.drawImage(videoEl, 0, 0, off.width, off.height);
        const dataUrl = off.toDataURL("image/jpeg", 0.8);

        const res = await fetch("http://localhost:5000/api/predict_emotion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });

        if (!res.ok) {
          setEmotion({ label: "Unavailable", score: 0 });
          return;
        }

        const body = await res.json();
        if (body.label) {
          setEmotion({ label: body.label, score: body.score || 0 });

          if ((body.score || 0) <= 0.5) return;

      const em = body.label.toLowerCase();

      if (em.includes("happy")) fireEmoji("😄");
      else if (em.includes("sad")) fireEmoji("😢");
      else if (em.includes("angry")) fireEmoji("😡");
      else if (em.includes("surprise")) fireEmoji("😲");
      else fireEmoji("🙂");
    };
        
      } catch {}
    };

    init();

    return () => {
      const video = captured.video;
      const canvas = captured.canvas;
      const stream = captured.stream || streamRef.current;
      const hand = captured.hand || handLandmarkerRef.current;
      const rafId = captured.raf || animationRef.current;

      isActive = false;
      try {
        if (rafId) cancelAnimationFrame(rafId);
      } catch {}

      if (stream) {
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch {}
        if (video) video.srcObject = null;
        streamRef.current = null;
      }

      if (captured.emotionInterval)
        try {
          clearInterval(captured.emotionInterval);
        } catch {}

      if (video)
        try {
          video.pause();
        } catch {}

      if (canvas) {
        try {
          const c = canvas.getContext("2d");
          if (c) c.clearRect(0, 0, canvas.width, canvas.height);
        } catch {}
      }

      if (hand) {
        try {
          if (typeof hand.close === "function") hand.close();
          else if (typeof hand.dispose === "function") hand.dispose();
        } catch {}
      }
    };
  }, []);

  // LANGUAGE RETRANSLATION
  useEffect(() => {
    if (!prediction) return;

    translateCacheRef.current = {};

    (async () => {
      const rawServerLabel = prediction.raw?.label || prediction.id;

      let newLabel = rawServerLabel;
      if (!lang.startsWith("en")) {
        newLabel = await translateOnDemand(rawServerLabel, lang);
      }

      setPrediction((p) => (p ? { ...p, label: newLabel } : p));
    })();
  }, [lang]);

  // SPEAK NEW PREDICTION
  useEffect(() => {
    if (!prediction) return;

    const now = performance.now();
    const last = lastSpokenRef.current;
    const displayText = prediction.label;

    if (
      displayText &&
      now - last.time > SPEAK_COOLDOWN &&
      displayText !== last.label
    ) {
      speakText(lang, displayText);
      lastSpokenRef.current = { label: displayText, time: now };
    }
  }, [prediction]);

  const setLanguage = (newLang) => {
    try {
      localStorage.setItem("lang", newLang);
    } catch {}
    setLang(newLang);
  };

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

      {/* Language Selector */}
      <div style={{ position: "absolute", left: 12, bottom: 12, zIndex: 60 }}>
        <label
          htmlFor="lang-select"
          style={{
            display: "block",
            marginBottom: 6,
            color: "#fff",
            fontSize: 12,
          }}
        >
          Language
        </label>

        <select
          id="lang-select"
          value={lang}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            fontSize: 14,
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* Prediction */}
      {prediction && (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            background: "rgba(255,255,255,0.95)",
            padding: "8px 12px",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 700, color: "#111" }}>
            {prediction.label ?? prediction.id}
          </div>
          <div style={{ fontSize: 12, color: "#333" }}>
            Conf: {(prediction.confidence || 0).toFixed(2)}
          </div>
        </div>
      )}

      {/* Emotion */}
      {emotion && (
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            background: "rgba(255,255,255,0.9)",
            padding: "6px 10px",
            borderRadius: 10,
          }}
        >
          <div style={{ fontWeight: 700, color: "#111" }}>
            {emotion.label}
          </div>
          <div style={{ fontSize: 12, color: "#333" }}>
            Score: {(emotion.score || 0).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoFeed;
