import React, { useEffect, useRef, useState, useCallback } from "react";

const MODEL_URL = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
const DETECT_INTERVAL_MS = 3000;

export default function ProctorWebcam({ onEvent }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("initializing");
  const [modelsReady, setModelsReady] = useState(false);
  const consecutiveMissing = useRef(0);

  // Drag coordinates and interaction locks
  const [position, setPosition] = useState({ x: window.innerWidth - 210, y: window.innerHeight - 230 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 195, e.clientX - dragStart.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 220, e.clientY - dragStart.current.y));
    setPosition({ x: newX, y: newY });
  }, [position]);

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (e) => {
    isDragging.current = true;
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
  };

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    const touch = e.touches[0];
    const newX = Math.max(0, Math.min(window.innerWidth - 195, touch.clientX - dragStart.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 220, touch.clientY - dragStart.current.y));
    setPosition({ x: newX, y: newY });
  }, [position]);

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove]);

  useEffect(() => {
    const move = (e) => handleTouchMove(e);
    const end = () => handleTouchEnd();
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    return () => {
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
    };
  }, [handleTouchMove]);

  useEffect(() => {
    let stream;
    let interval;
    let cancelled = false;

    async function init() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 240, height: 180 } });
        if (cancelled) return;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        setStatus("unavailable");
        onEvent?.("cameraDenied", { message: e.message });
        return;
      }

      try {
        const faceapi = window.faceapi;
        if (!faceapi) throw new Error("face-api.js not loaded");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        if (cancelled) return;
        setModelsReady(true);
        setStatus("ok");

        interval = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const detections = await faceapi.detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            );
            if (detections.length === 0) {
              consecutiveMissing.current += 1;
              setStatus("no-face");
              if (consecutiveMissing.current >= 2) {
                onEvent?.("faceMissing");
                consecutiveMissing.current = 0;
              }
            } else if (detections.length > 1) {
              setStatus("multi-face");
              onEvent?.("multiFace");
              consecutiveMissing.current = 0;
            } else {
              setStatus("ok");
              consecutiveMissing.current = 0;
            }
          } catch {
            /* ignore transient errors */
          }
        }, DETECT_INTERVAL_MS);
      } catch (e) {
        setStatus("unavailable");
      }
    }

    init();
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const labels = {
    initializing: "Starting camera…",
    ok: "Face detected",
    "no-face": "Face not visible",
    "multi-face": "Multiple faces!",
    unavailable: "AI detection offline"
  };

  return (
    <div
      className="proctor-widget"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: "auto",
        right: "auto",
        cursor: "move",
        position: "fixed",
        touchAction: "none"
      }}
    >
      <video ref={videoRef} autoPlay muted playsInline />
      <div className="proctor-status">
        <span className={`status-dot ${status !== "ok" ? "warn" : ""}`} />
        {labels[status]}
      </div>
    </div>
  );
}