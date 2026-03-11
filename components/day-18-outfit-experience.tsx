"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  DAY18_OUTFITS,
  type Day18OutfitId,
  type Day18OverlayTransform,
  type Day18State
} from "@/lib/day18";
import { LoadingRing } from "@/components/loading-ring";

type CameraState = "idle" | "requesting" | "ready" | "error";
type RequestState = "idle" | "loading";
type FaceTrackingState = "unsupported" | "idle" | "detecting" | "tracking";
type FaceAnchor = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};
type PreviewFrameSize = {
  width: number;
  height: number;
};
type VideoFrameSize = {
  width: number;
  height: number;
};

const PHOTO_STORAGE_KEY = "digital-nauryz:day18:last-photo";
const OVERLAY_SETTINGS_STORAGE_KEY = "digital-nauryz:day18:overlay-settings";
const MEDIAPIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const MEDIAPIPE_FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const FACE_TRACKING_INTERVAL_MS = 120;
const FACE_TRACKING_SMOOTHING = 0.28;

const DEFAULT_OVERLAY_SETTINGS: Record<Day18OutfitId, Day18OverlayTransform> = {
  saukele: {
    offsetX: 0,
    offsetY: -28,
    scale: 1,
    rotation: 0
  },
  tyubeteika: {
    offsetX: 0,
    offsetY: -24,
    scale: 1,
    rotation: 0
  },
  chapan: {
    offsetX: 0,
    offsetY: 22,
    scale: 1,
    rotation: 0
  }
};

export function Day18OutfitExperience() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackingLoopRef = useRef<number | null>(null);
  const trackingBusyRef = useRef(false);
  const lastTrackingTsRef = useRef(0);
  const smoothedAnchorRef = useRef<FaceAnchor | null>(null);
  const faceLandmarkerRef = useRef<{
    detectForVideo: (videoFrame: HTMLVideoElement, timestamp: number) => {
      faceLandmarks?: Array<Array<{ x: number; y: number }>>;
    };
    close?: () => void;
  } | null>(null);
  const [state, setState] = useState<Day18State | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [faceTrackingState, setFaceTrackingState] = useState<FaceTrackingState>("idle");
  const [selectedOutfitId, setSelectedOutfitId] = useState<Day18OutfitId>(DAY18_OUTFITS[0].id);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [overlaySettings, setOverlaySettings] = useState<Record<Day18OutfitId, Day18OverlayTransform>>(
    DEFAULT_OVERLAY_SETTINGS
  );
  const [faceAnchor, setFaceAnchor] = useState<FaceAnchor | null>(null);
  const [previewFrameSize, setPreviewFrameSize] = useState<PreviewFrameSize>({
    width: 0,
    height: 420
  });
  const [videoFrameSize, setVideoFrameSize] = useState<VideoFrameSize>({
    width: 0,
    height: 0
  });

  const selectedOutfit = useMemo(
    () => DAY18_OUTFITS.find((outfit) => outfit.id === selectedOutfitId) ?? DAY18_OUTFITS[0],
    [selectedOutfitId]
  );
  const selectedOverlay = overlaySettings[selectedOutfitId];

  const loadState = async (showSpinner = false) => {
    if (showSpinner) {
      setRequestState("loading");
    }

    const response = await fetch("/api/day18", {
      credentials: "same-origin"
    });
    const payload = (await response.json().catch(() => null)) as Day18State | { error?: string } | null;

    if (!response.ok || !payload || "error" in payload) {
      setRequestState("idle");
      return;
    }

    setState(payload as Day18State);
    setRequestState("idle");
  };

  useEffect(() => {
    void loadState(true);

    try {
      const stored = window.localStorage.getItem(PHOTO_STORAGE_KEY);
      setPhotoDataUrl(stored || null);
    } catch {
      setPhotoDataUrl(null);
    }

    try {
      const storedSettings = window.localStorage.getItem(OVERLAY_SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings) as Partial<Record<Day18OutfitId, Day18OverlayTransform>>;
        setOverlaySettings({
          saukele: { ...DEFAULT_OVERLAY_SETTINGS.saukele, ...parsed.saukele },
          tyubeteika: { ...DEFAULT_OVERLAY_SETTINGS.tyubeteika, ...parsed.tyubeteika },
          chapan: { ...DEFAULT_OVERLAY_SETTINGS.chapan, ...parsed.chapan }
        });
      }
    } catch {
      setOverlaySettings(DEFAULT_OVERLAY_SETTINGS);
    }

    return () => {
      if (trackingLoopRef.current) {
        window.cancelAnimationFrame(trackingLoopRef.current);
      }
      faceLandmarkerRef.current?.close?.();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        OVERLAY_SETTINGS_STORAGE_KEY,
        JSON.stringify(overlaySettings)
      );
    } catch {
      void 0;
    }
  }, [overlaySettings]);

  useEffect(() => {
    const frame = previewFrameRef.current;

    if (!frame) {
      return;
    }

    const updateSize = () => {
      const rect = frame.getBoundingClientRect();
      const nextWidth = rect.width || frame.clientWidth || frame.offsetWidth || 320;
      const nextHeight = rect.height || frame.clientHeight || frame.offsetHeight || 420;

      setPreviewFrameSize({
        width: nextWidth,
        height: nextHeight
      });
    };

    updateSize();

    let frameId = 0;
    let attempts = 0;

    const syncUntilMeasured = () => {
      updateSize();
      attempts += 1;

      if (attempts < 30) {
        frameId = window.requestAnimationFrame(syncUntilMeasured);
      }
    };

    frameId = window.requestAnimationFrame(syncUntilMeasured);

    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateSize();
      });

      observer.observe(frame);
    }

    window.addEventListener("resize", updateSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateSize);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    setFaceTrackingState("idle");
  }, []);

  useEffect(() => {
    if (trackingLoopRef.current) {
      window.cancelAnimationFrame(trackingLoopRef.current);
      trackingLoopRef.current = null;
    }

    if (cameraState !== "ready" || typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    lastTrackingTsRef.current = 0;
    smoothedAnchorRef.current = null;

    const ensureLandmarker = async () => {
      if (faceLandmarkerRef.current) {
        return faceLandmarkerRef.current;
      }

      const visionModule = await import("@mediapipe/tasks-vision");
      const wasmFileset = await visionModule.FilesetResolver.forVisionTasks(
        MEDIAPIPE_WASM_URL
      );
      const landmarker = await visionModule.FaceLandmarker.createFromOptions(
        wasmFileset,
        {
          baseOptions: {
            modelAssetPath: MEDIAPIPE_FACE_LANDMARKER_MODEL_URL
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        }
      );
      faceLandmarkerRef.current = landmarker;
      return landmarker;
    };

    const detectFace = async (frameTime = 0) => {
      if (!cancelled) {
        trackingLoopRef.current = window.requestAnimationFrame((nextFrameTime) => {
          void detectFace(nextFrameTime);
        });
      }

      if (trackingBusyRef.current || cancelled) {
        return;
      }

      if (frameTime - lastTrackingTsRef.current < FACE_TRACKING_INTERVAL_MS) {
        return;
      }

      const video = videoRef.current;

      if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
        return;
      }

      trackingBusyRef.current = true;
      lastTrackingTsRef.current = frameTime || performance.now();

      try {
        const landmarker = await ensureLandmarker();

        if (cancelled) {
          return;
        }

        const result = landmarker.detectForVideo(video, performance.now());
        const face = result.faceLandmarks?.[0];

        if (!face || face.length === 0) {
          setFaceTrackingState("detecting");
          trackingLoopRef.current = window.requestAnimationFrame(() => {
            void detectFace();
          });
          return;
        }

        let minX = 1;
        let minY = 1;
        let maxX = 0;
        let maxY = 0;

        face.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });

        const width = Math.max(0.12, maxX - minX);
        const height = Math.max(0.16, maxY - minY);
        const nextAnchor = {
          centerX: minX + width / 2,
          centerY: minY + height / 2,
          width,
          height
        };
        const previousAnchor = smoothedAnchorRef.current;
        const smoothedAnchor = previousAnchor
          ? {
              centerX: previousAnchor.centerX + (nextAnchor.centerX - previousAnchor.centerX) * FACE_TRACKING_SMOOTHING,
              centerY: previousAnchor.centerY + (nextAnchor.centerY - previousAnchor.centerY) * FACE_TRACKING_SMOOTHING,
              width: previousAnchor.width + (nextAnchor.width - previousAnchor.width) * FACE_TRACKING_SMOOTHING,
              height: previousAnchor.height + (nextAnchor.height - previousAnchor.height) * FACE_TRACKING_SMOOTHING
            }
          : nextAnchor;

        smoothedAnchorRef.current = smoothedAnchor;
        setFaceAnchor(smoothedAnchor);
        setFaceTrackingState("tracking");
      } catch {
        setFaceTrackingState("unsupported");
      } finally {
        trackingBusyRef.current = false;
      }
    };

    setFaceTrackingState("detecting");
    trackingLoopRef.current = window.requestAnimationFrame((frameTime) => {
      void detectFace(frameTime);
    });

    return () => {
      cancelled = true;
      if (trackingLoopRef.current) {
        window.cancelAnimationFrame(trackingLoopRef.current);
        trackingLoopRef.current = null;
      }
    };
  }, [cameraState]);

  useEffect(() => {
    if (cameraState !== "ready") {
      return;
    }

    let frameId = 0;
    let attempts = 0;

    const syncVideoSize = () => {
      const video = videoRef.current;

      if (video?.videoWidth && video.videoHeight) {
        setVideoFrameSize({
          width: video.videoWidth,
          height: video.videoHeight
        });
        return;
      }

      attempts += 1;

      if (attempts < 60) {
        frameId = window.requestAnimationFrame(syncVideoSize);
      }
    };

    frameId = window.requestAnimationFrame(syncVideoSize);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [cameraState]);

  const enableCamera = async () => {
    setCameraState("requesting");
    setFeedback(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 960 }
        },
        audio: false
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setVideoFrameSize({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight
        });
      }

      setCameraState("ready");
    } catch {
      setCameraState("error");
      setFeedback("Не удалось получить доступ к фронтальной камере.");
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;

    if (!video || !state?.isAuthenticated) {
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setFeedback("Камера еще не готова к съемке.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setFeedback("Не удалось подготовить снимок.");
      return;
    }

    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    drawOutfitOverlay(
      context,
      canvas.width,
      canvas.height,
      selectedOutfitId,
      selectedOverlay,
      faceAnchor
    );

    const nextPhoto = canvas.toDataURL("image/png");
    setPhotoDataUrl(nextPhoto);

    try {
      window.localStorage.setItem(PHOTO_STORAGE_KEY, nextPhoto);
    } catch {
      void 0;
    }

    setRequestState("loading");
    setFeedback(null);

    const response = await fetch("/api/day18/capture", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        outfitId: selectedOutfitId
      })
    });
    const payload = (await response.json().catch(() => null)) as Day18State | { error?: string } | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Снимок не сохранен." : "Снимок не сохранен.");
      setRequestState("idle");
      return;
    }

    setState(payload as Day18State);
    setFeedback("Фото сохранено. Если это первый снимок, очки уже начислены.");
    setRequestState("idle");
  };

  if (!state) {
    return <LoadingCard text="Загружаем День национальной одежды..." />;
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 20 }}>AR-селфи с национальным образом</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Включите фронтальную камеру, выберите образ и сделайте снимок. За первое фото начисляется {state.rewardPoints} очков.
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10
          }}
        >
          <MetricCard label="Снимков" value={String(state.captureCount)} />
          <MetricCard label="Бонус" value={`+${state.rewardPoints}`} />
          <MetricCard label="Статус" value={state.hasCapturedFirstPhoto ? "Завершено" : "Ожидает"} />
        </div>
      </section>

      {!state.isAuthenticated ? (
        <InfoCard
          title="Требуется авторизация"
          description="Откройте приложение внутри Telegram, чтобы снимать селфи, сохранять прогресс и получать очки."
        />
      ) : null}

      {state.isAuthenticated ? (
        <>
          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Выберите образ</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Образ накладывается поверх камеры и попадет в итоговый снимок.
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {DAY18_OUTFITS.map((outfit) => (
                <button
                  key={outfit.id}
                  type="button"
                  onClick={() => setSelectedOutfitId(outfit.id)}
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border:
                      outfit.id === selectedOutfitId
                        ? "2px solid var(--accent-strong)"
                        : "1px solid var(--line)",
                    background:
                      outfit.id === selectedOutfitId
                        ? "rgba(179, 73, 16, 0.08)"
                        : "white",
                    textAlign: "left",
                    display: "grid",
                    gap: 6,
                    cursor: "pointer"
                  }}
                >
                  <strong>{outfit.name}</strong>
                  <span style={{ color: "var(--muted)" }}>{outfit.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Камера</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Включите фронтальную камеру и сделайте снимок. Превью зеркалится, а готовое фото сохраняется в нормальном виде.
              </p>
              <span style={{ color: "var(--muted)" }}>
                {faceTrackingState === "tracking"
                  ? "Маска автоматически привязана к лицу."
                  : faceTrackingState === "detecting"
                    ? "Ищем лицо в кадре через MediaPipe."
                    : faceTrackingState === "unsupported"
                      ? "MediaPipe не запустился, используйте ручную подстройку."
                      : "Автопривязка включится после запуска камеры."}
              </span>
            </div>

            <div
              ref={previewFrameRef}
              style={{
                position: "relative",
                borderRadius: 24,
                overflow: "hidden",
                background: "linear-gradient(180deg, #e8dcc6 0%, #d8c6a7 100%)",
                minHeight: 420,
                border: "1px solid var(--line)"
              }}
            >
              {cameraState !== "ready" ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    alignContent: "center",
                    justifyItems: "center",
                    gap: 12,
                    padding: 20,
                    textAlign: "center"
                  }}
                >
                  {cameraState === "requesting" ? (
                    <>
                      <LoadingRing size={56} label="Запрашиваем доступ к камере" />
                      <strong>Запрашиваем доступ к камере</strong>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: "50%",
                          border: "2px solid rgba(79, 45, 24, 0.18)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 28
                        }}
                      >
                        +
                      </div>
                      <strong>Камера пока не включена</strong>
                    </>
                  )}
                </div>
              ) : null}

              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                disablePictureInPicture
                onLoadedMetadata={(event) => {
                  setVideoFrameSize({
                    width: event.currentTarget.videoWidth,
                    height: event.currentTarget.videoHeight
                  });
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                  pointerEvents: "none",
                  display: cameraState === "ready" ? "block" : "none"
                }}
              />

              {cameraState === "ready" ? (
                <PreviewOutfitOverlay
                  outfitId={selectedOutfitId}
                  transform={selectedOverlay}
                  faceAnchor={faceAnchor}
                  previewWidth={previewFrameSize.width || 320}
                  previewHeight={previewFrameSize.height || 420}
                  videoWidth={videoFrameSize.width || previewFrameSize.width || 320}
                  videoHeight={videoFrameSize.height || previewFrameSize.height || 420}
                />
              ) : null}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10
              }}
            >
              <button
                type="button"
                onClick={() => void enableCamera()}
                disabled={cameraState === "requesting"}
                style={buttonStyle("secondary", cameraState === "requesting")}
              >
                {cameraState === "ready"
                  ? "Перезапустить камеру"
                  : cameraState === "requesting"
                    ? "Подключаем..."
                    : "Включить камеру"}
              </button>
              <button
                type="button"
                onClick={() => void capturePhoto()}
                disabled={cameraState !== "ready" || requestState === "loading"}
                style={buttonStyle("primary", cameraState !== "ready" || requestState === "loading")}
              >
                {requestState === "loading" ? "Сохраняем..." : "Сделать фото"}
              </button>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Подстройка образа</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Подвиньте и поверните образ так, чтобы он лучше совпадал с положением головы и плеч перед снимком.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <RangeField
                label="По горизонтали"
                value={selectedOverlay.offsetX}
                min={-30}
                max={30}
                step={1}
                onChange={(value) =>
                  setOverlaySettings((current) => ({
                    ...current,
                    [selectedOutfitId]: {
                      ...current[selectedOutfitId],
                      offsetX: value
                    }
                  }))
                }
              />
              <RangeField
                label="По вертикали"
                value={selectedOverlay.offsetY}
                min={-30}
                max={30}
                step={1}
                onChange={(value) =>
                  setOverlaySettings((current) => ({
                    ...current,
                    [selectedOutfitId]: {
                      ...current[selectedOutfitId],
                      offsetY: value
                    }
                  }))
                }
              />
              <RangeField
                label="Размер"
                value={selectedOverlay.scale}
                min={0.7}
                max={1.35}
                step={0.01}
                valueFormatter={(value) => `${Math.round(value * 100)}%`}
                onChange={(value) =>
                  setOverlaySettings((current) => ({
                    ...current,
                    [selectedOutfitId]: {
                      ...current[selectedOutfitId],
                      scale: value
                    }
                  }))
                }
              />
              <RangeField
                label="Наклон"
                value={selectedOverlay.rotation}
                min={-20}
                max={20}
                step={1}
                valueFormatter={(value) => `${Math.round(value)}°`}
                onChange={(value) =>
                  setOverlaySettings((current) => ({
                    ...current,
                    [selectedOutfitId]: {
                      ...current[selectedOutfitId],
                      rotation: value
                    }
                  }))
                }
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setOverlaySettings((current) => ({
                  ...current,
                  [selectedOutfitId]: DEFAULT_OVERLAY_SETTINGS[selectedOutfitId]
                }))
              }
              style={buttonStyle("secondary")}
            >
              Сбросить положение
            </button>
          </section>

          {photoDataUrl ? (
            <section style={cardStyle}>
              <div style={{ display: "grid", gap: 6 }}>
                <h3 style={{ margin: 0 }}>Последний снимок</h3>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                  Фото хранится локально на этом устройстве. Его можно скачать или отправить дальше.
                </p>
              </div>

              <img
                src={photoDataUrl}
                alt="Селфи в национальном образе"
                style={{
                  width: "100%",
                  borderRadius: 22,
                  border: "1px solid var(--line)",
                  display: "block"
                }}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10
                }}
              >
                <button
                  type="button"
                  onClick={() => downloadImage(photoDataUrl, selectedOutfit.name)}
                  style={buttonStyle("secondary")}
                >
                  Скачать фото
                </button>
                <button
                  type="button"
                  onClick={() => void sharePhoto(photoDataUrl, selectedOutfit.name)}
                  style={buttonStyle("primary")}
                >
                  Поделиться
                </button>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {feedback ? (
        <div
          style={{
            padding: 14,
            borderRadius: 18,
            background: "rgba(179, 73, 16, 0.08)",
            color: "var(--text)",
            border: "1px solid rgba(179, 73, 16, 0.14)"
          }}
        >
          {feedback}
        </div>
      ) : null}
    </section>
  );
}

function drawOutfitOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  outfitId: Day18OutfitId,
  transform: Day18OverlayTransform,
  faceAnchor: FaceAnchor | null
) {
  const placement = getSourceOverlayPlacement(width, height, outfitId, transform, faceAnchor);
  const centerX = placement.centerX;
  const centerY = placement.centerY;
  const overlayWidth = placement.width;
  const overlayHeight = placement.height;

  context.save();
  context.translate(centerX, centerY);
  context.rotate((transform.rotation * Math.PI) / 180);
  context.translate(-overlayWidth / 2, -overlayHeight / 2);

  if (outfitId === "saukele") {
    context.fillStyle = "rgba(208,170,60,0.82)";
    context.strokeStyle = "#5f3a1f";
    context.lineWidth = Math.max(3, overlayWidth * 0.012);
    context.beginPath();
    context.moveTo(overlayWidth * 0.32, overlayHeight * 0.26);
    context.lineTo(overlayWidth * 0.41, overlayHeight * 0.08);
    context.lineTo(overlayWidth * 0.5, 0);
    context.lineTo(overlayWidth * 0.59, overlayHeight * 0.08);
    context.lineTo(overlayWidth * 0.68, overlayHeight * 0.26);
    context.lineTo(overlayWidth * 0.63, overlayHeight * 0.5);
    context.lineTo(overlayWidth * 0.37, overlayHeight * 0.5);
    context.closePath();
    context.fill();
    context.stroke();

    context.strokeStyle = "#fef4cc";
    context.lineWidth = Math.max(2, overlayWidth * 0.008);
    context.beginPath();
    context.moveTo(overlayWidth * 0.43, overlayHeight * 0.12);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.06, overlayWidth * 0.57, overlayHeight * 0.12);
    context.stroke();

    context.strokeStyle = "#d2a929";
    context.lineWidth = Math.max(4, overlayWidth * 0.01);
    context.beginPath();
    context.moveTo(overlayWidth * 0.37, overlayHeight * 0.5);
    context.quadraticCurveTo(overlayWidth * 0.24, overlayHeight * 0.74, overlayWidth * 0.2, overlayHeight * 0.96);
    context.moveTo(overlayWidth * 0.63, overlayHeight * 0.5);
    context.quadraticCurveTo(overlayWidth * 0.76, overlayHeight * 0.74, overlayWidth * 0.8, overlayHeight * 0.96);
    context.stroke();
    context.restore();
    return;
  }

  if (outfitId === "tyubeteika") {
    context.fillStyle = "rgba(42,76,52,0.85)";
    context.strokeStyle = "#f4d17a";
    context.lineWidth = Math.max(3, overlayWidth * 0.01);
    context.beginPath();
    context.moveTo(overlayWidth * 0.2, overlayHeight * 0.38);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.08, overlayWidth * 0.8, overlayHeight * 0.38);
    context.lineTo(overlayWidth * 0.84, overlayHeight * 0.56);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.7, overlayWidth * 0.16, overlayHeight * 0.56);
    context.closePath();
    context.fill();
    context.stroke();

    context.strokeStyle = "#fff5ce";
    context.lineWidth = Math.max(2, overlayWidth * 0.007);
    context.beginPath();
    context.moveTo(overlayWidth * 0.3, overlayHeight * 0.36);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.18, overlayWidth * 0.7, overlayHeight * 0.36);
    context.moveTo(overlayWidth * 0.24, overlayHeight * 0.5);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.6, overlayWidth * 0.76, overlayHeight * 0.5);
    context.stroke();
    context.restore();
    return;
  }

  context.fillStyle = "rgba(143,47,23,0.28)";
  context.strokeStyle = "#d2a929";
  context.lineWidth = Math.max(3, overlayWidth * 0.01);
  context.beginPath();
  context.moveTo(overlayWidth * 0.08, overlayHeight * 0.26);
  context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.18, overlayWidth * 0.92, overlayHeight * 0.26);
  context.lineTo(overlayWidth * 0.82, overlayHeight * 0.98);
  context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 1.04, overlayWidth * 0.18, overlayHeight * 0.98);
  context.closePath();
  context.fill();
  context.stroke();

  context.strokeStyle = "#f4d17a";
  context.lineWidth = Math.max(2, overlayWidth * 0.007);
  context.beginPath();
  context.moveTo(overlayWidth * 0.5, overlayHeight * 0.26);
  context.lineTo(overlayWidth * 0.5, overlayHeight * 0.92);
  context.moveTo(overlayWidth * 0.26, overlayHeight * 0.46);
  context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.52, overlayWidth * 0.74, overlayHeight * 0.46);
  context.stroke();

  context.fillStyle = "rgba(166,42,36,0.86)";
  context.strokeStyle = "#f4d17a";
  context.lineWidth = Math.max(2.5, overlayWidth * 0.008);
  context.beginPath();
  context.moveTo(overlayWidth * 0.22, overlayHeight * 0.02);
  context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * -0.08, overlayWidth * 0.78, overlayHeight * 0.02);
  context.lineTo(overlayWidth * 0.7, overlayHeight * 0.14);
  context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.1, overlayWidth * 0.3, overlayHeight * 0.14);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function PreviewOutfitOverlay({
  outfitId,
  transform,
  faceAnchor,
  previewWidth,
  previewHeight,
  videoWidth,
  videoHeight
}: {
  outfitId: Day18OutfitId;
  transform: Day18OverlayTransform;
  faceAnchor: FaceAnchor | null;
  previewWidth: number,
  previewHeight: number,
  videoWidth: number;
  videoHeight: number;
}) {
  const placement = getPreviewOverlayPlacement(
    previewWidth,
    previewHeight,
    videoWidth,
    videoHeight,
    outfitId,
    transform,
    faceAnchor
  );

  const frameStyle = {
    position: "absolute",
    left: placement.centerX - placement.width / 2,
    top: placement.centerY - placement.height / 2,
    width: placement.width,
    height: placement.height,
    transform: `rotate(${transform.rotation}deg)`,
    transformOrigin: "50% 50%",
    zIndex: 2,
    pointerEvents: "none",
    filter: "drop-shadow(0 8px 14px rgba(41, 20, 7, 0.22))"
  } as const;

  if (outfitId === "saukele") {
    return (
      <div style={frameStyle}>
        <div
          style={{
            position: "absolute",
            left: "25%",
            top: "0%",
            width: "50%",
            height: "52%",
            background: "linear-gradient(180deg, #f4d26f 0%, #d2a929 72%, #bb8e1f 100%)",
            clipPath: "polygon(50% 0%, 82% 22%, 96% 86%, 4% 86%, 18% 22%)",
            border: "2px solid #5f3a1f",
            borderRadius: "18px 18px 10px 10px"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "33%",
            top: "10%",
            width: "34%",
            height: "6%",
            borderTop: "2px solid #fff7d7",
            borderRadius: "999px"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "31%",
            top: "48%",
            width: "4%",
            height: "36%",
            background: "#d2a929",
            borderRadius: 999
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "31%",
            top: "48%",
            width: "4%",
            height: "36%",
            background: "#d2a929",
            borderRadius: 999
          }}
        />
      </div>
    );
  }

  if (outfitId === "tyubeteika") {
    return (
      <div style={frameStyle}>
        <div
          style={{
            position: "absolute",
            left: "12%",
            top: "10%",
            width: "76%",
            height: "30%",
            background: "linear-gradient(180deg, #2b6145 0%, #1e4d35 100%)",
            border: "2px solid #f4d17a",
            borderRadius: "48% 48% 30% 30% / 72% 72% 28% 28%"
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "25%",
            top: "18%",
            width: "50%",
            height: "5%",
            borderTop: "2px solid #fff3c4",
            borderRadius: 999
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "19%",
            top: "28%",
            width: "62%",
            height: "5%",
            borderTop: "2px solid #fff3c4",
            borderRadius: 999
          }}
        />
      </div>
    );
  }

  return (
    <div style={frameStyle}>
      <div
        style={{
          position: "absolute",
          left: "18%",
          top: "6%",
          width: "64%",
          height: "10%",
          background: "linear-gradient(180deg, #8d2f17 0%, #7a2712 100%)",
          border: "2px solid #f4d17a",
          borderRadius: "18px 18px 12px 12px"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "6%",
          top: "12%",
          width: "88%",
          height: "74%",
          background: "linear-gradient(180deg, rgba(143,47,23,0.42) 0%, rgba(111,31,16,0.30) 100%)",
          border: "2px solid #d2a929",
          clipPath: "polygon(10% 0%, 90% 0%, 100% 18%, 88% 100%, 12% 100%, 0% 18%)",
          borderRadius: "0"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "49%",
          top: "18%",
          width: "2%",
          height: "58%",
          background: "#f4d17a"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "16%",
          top: "20%",
          width: "14%",
          height: "36%",
          borderLeft: "2px solid #f4d17a",
          borderTop: "2px solid #f4d17a",
          transform: "skewY(18deg)"
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "16%",
          top: "20%",
          width: "14%",
          height: "36%",
          borderRight: "2px solid #f4d17a",
          borderTop: "2px solid #f4d17a",
          transform: "skewY(-18deg)"
        }}
      />
    </div>
  );
}

function drawOutfitShape(
  context: CanvasRenderingContext2D,
  overlayWidth: number,
  overlayHeight: number,
  outfitId: Day18OutfitId
) {
  if (outfitId === "saukele") {
    context.fillStyle = "rgba(208,170,60,0.95)";
    context.strokeStyle = "#5f3a1f";
    context.lineWidth = Math.max(2.5, overlayWidth * 0.012);
    context.beginPath();
    context.moveTo(overlayWidth * 0.32, overlayHeight * 0.26);
    context.lineTo(overlayWidth * 0.41, overlayHeight * 0.08);
    context.lineTo(overlayWidth * 0.5, 0);
    context.lineTo(overlayWidth * 0.59, overlayHeight * 0.08);
    context.lineTo(overlayWidth * 0.68, overlayHeight * 0.26);
    context.lineTo(overlayWidth * 0.63, overlayHeight * 0.5);
    context.lineTo(overlayWidth * 0.37, overlayHeight * 0.5);
    context.closePath();
    context.fill();
    context.stroke();

    context.strokeStyle = "#fff6d8";
    context.lineWidth = Math.max(1.5, overlayWidth * 0.008);
    context.beginPath();
    context.moveTo(overlayWidth * 0.43, overlayHeight * 0.12);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.06, overlayWidth * 0.57, overlayHeight * 0.12);
    context.stroke();

    context.strokeStyle = "#d2a929";
    context.lineWidth = Math.max(3, overlayWidth * 0.01);
    context.beginPath();
    context.moveTo(overlayWidth * 0.37, overlayHeight * 0.5);
    context.quadraticCurveTo(overlayWidth * 0.24, overlayHeight * 0.74, overlayWidth * 0.2, overlayHeight * 0.96);
    context.moveTo(overlayWidth * 0.63, overlayHeight * 0.5);
    context.quadraticCurveTo(overlayWidth * 0.76, overlayHeight * 0.74, overlayWidth * 0.8, overlayHeight * 0.96);
    context.stroke();
    return;
  }

  if (outfitId === "tyubeteika") {
    context.fillStyle = "rgba(42,76,52,0.92)";
    context.strokeStyle = "#f4d17a";
    context.lineWidth = Math.max(2.5, overlayWidth * 0.01);
    context.beginPath();
    context.moveTo(overlayWidth * 0.2, overlayHeight * 0.38);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.08, overlayWidth * 0.8, overlayHeight * 0.38);
    context.lineTo(overlayWidth * 0.84, overlayHeight * 0.56);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.7, overlayWidth * 0.16, overlayHeight * 0.56);
    context.closePath();
    context.fill();
    context.stroke();

    context.strokeStyle = "#fff5ce";
    context.lineWidth = Math.max(1.5, overlayWidth * 0.007);
    context.beginPath();
    context.moveTo(overlayWidth * 0.3, overlayHeight * 0.36);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.18, overlayWidth * 0.7, overlayHeight * 0.36);
    context.moveTo(overlayWidth * 0.24, overlayHeight * 0.5);
    context.quadraticCurveTo(overlayWidth * 0.5, overlayHeight * 0.6, overlayWidth * 0.76, overlayHeight * 0.5);
    context.stroke();
    return;
  }

  context.fillStyle = "rgba(143,47,23,0.36)";
  context.strokeStyle = "#d2a929";
  context.lineWidth = Math.max(2.5, overlayWidth * 0.01);
  context.beginPath();
  context.moveTo(overlayWidth * 0.12, overlayHeight * 0.18);
  context.lineTo(overlayWidth * 0.88, overlayHeight * 0.18);
  context.lineTo(overlayWidth, overlayHeight * 0.34);
  context.lineTo(overlayWidth * 0.88, overlayHeight);
  context.lineTo(overlayWidth * 0.12, overlayHeight);
  context.lineTo(0, overlayHeight * 0.34);
  context.closePath();
  context.fill();
  context.stroke();

  context.strokeStyle = "#f4d17a";
  context.lineWidth = Math.max(1.5, overlayWidth * 0.007);
  context.beginPath();
  context.moveTo(overlayWidth * 0.5, overlayHeight * 0.18);
  context.lineTo(overlayWidth * 0.5, overlayHeight * 0.86);
  context.moveTo(overlayWidth * 0.18, overlayHeight * 0.28);
  context.lineTo(overlayWidth * 0.1, overlayHeight * 0.56);
  context.moveTo(overlayWidth * 0.82, overlayHeight * 0.28);
  context.lineTo(overlayWidth * 0.9, overlayHeight * 0.56);
  context.stroke();

  context.fillStyle = "rgba(166,42,36,0.94)";
  context.strokeStyle = "#f4d17a";
  context.lineWidth = Math.max(2, overlayWidth * 0.008);
  context.beginPath();
  context.moveTo(overlayWidth * 0.2, overlayHeight * 0.06);
  context.lineTo(overlayWidth * 0.8, overlayHeight * 0.06);
  context.lineTo(overlayWidth * 0.8, overlayHeight * 0.18);
  context.lineTo(overlayWidth * 0.2, overlayHeight * 0.18);
  context.closePath();
  context.fill();
  context.stroke();
}

function getNormalizedOutfitPlacement(outfitId: Day18OutfitId, faceAnchor: FaceAnchor | null) {
  if (!faceAnchor) {
    if (outfitId === "saukele") {
      return { centerX: 0.5, centerY: 0.23, width: 0.34, height: 0.5 };
    }

    if (outfitId === "tyubeteika") {
      return { centerX: 0.5, centerY: 0.22, width: 0.34, height: 0.16 };
    }

    return { centerX: 0.5, centerY: 0.67, width: 0.84, height: 0.72 };
  }

  if (outfitId === "saukele") {
    return {
      centerX: faceAnchor.centerX,
      centerY: faceAnchor.centerY - faceAnchor.height * 0.74,
      width: faceAnchor.width * 1.95,
      height: faceAnchor.height * 2.35
    };
  }

  if (outfitId === "tyubeteika") {
    return {
      centerX: faceAnchor.centerX,
      centerY: faceAnchor.centerY - faceAnchor.height * 0.7,
      width: faceAnchor.width * 1.9,
      height: faceAnchor.height * 0.8
    };
  }

  return {
    centerX: faceAnchor.centerX,
    centerY: faceAnchor.centerY + faceAnchor.height * 1.65,
    width: faceAnchor.width * 3.7,
    height: faceAnchor.height * 3.7
  };
}

function getPreviewOverlayPlacement(
  previewWidth: number,
  previewHeight: number,
  videoWidth: number,
  videoHeight: number,
  outfitId: Day18OutfitId,
  transform: Day18OverlayTransform,
  faceAnchor: FaceAnchor | null
) {
  const placement = normalizePlacement(getNormalizedOutfitPlacement(outfitId, faceAnchor));
  const scale = Math.max(previewWidth / videoWidth, previewHeight / videoHeight);
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;
  const cropX = (renderedWidth - previewWidth) / 2;
  const cropY = (renderedHeight - previewHeight) / 2;
  const mirroredCenterX = (1 - placement.centerX) * renderedWidth - cropX;
  const centerY = placement.centerY * renderedHeight - cropY;

  return {
    centerX: mirroredCenterX - transform.offsetX,
    centerY: centerY + transform.offsetY,
    width: renderedWidth * placement.width * transform.scale,
    height: renderedHeight * placement.height * transform.scale
  };
}

function getSourceOverlayPlacement(
  width: number,
  height: number,
  outfitId: Day18OutfitId,
  transform: Day18OverlayTransform,
  faceAnchor: FaceAnchor | null
) {
  const placement = normalizePlacement(getNormalizedOutfitPlacement(outfitId, faceAnchor));

  return {
    centerX: width * (1 - placement.centerX) - transform.offsetX,
    centerY: height * placement.centerY + transform.offsetY,
    width: width * placement.width * transform.scale,
    height: height * placement.height * transform.scale
  };
}

function normalizePlacement(placement: {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}) {
  const width = clampNumber(placement.width, 0.12, 0.9);
  const height = clampNumber(placement.height, 0.12, 0.95);
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return {
    centerX: clampNumber(placement.centerX, halfWidth, 1 - halfWidth),
    centerY: clampNumber(placement.centerY, halfHeight, 1 - halfHeight),
    width,
    height
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function sharePhoto(photoDataUrl: string, outfitName: string) {
  if (navigator.share && navigator.canShare) {
    try {
      const file = dataUrlToFile(photoDataUrl, `nauryz-${outfitName.toLowerCase()}.png`);
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "День национальной одежды",
          text: `Мой образ Наурыза: ${outfitName}`,
          files: [file]
        });
        return;
      }
    } catch {
      void 0;
    }
  }

  try {
    await navigator.clipboard.writeText(photoDataUrl);
  } catch {
    return;
  }
}

function downloadImage(photoDataUrl: string, outfitName: string) {
  const link = document.createElement("a");
  link.href = photoDataUrl;
  link.download = `nauryz-${outfitName.toLowerCase()}.png`;
  link.click();
}

function dataUrlToFile(dataUrl: string, filename: string) {
  const parts = dataUrl.split(",");
  const mime = parts[0]?.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(parts[1] ?? "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: mime });
}

function LoadingCard({ text }: { text: string }) {
  return (
    <div
      style={{
        ...cardStyle,
        minHeight: 220,
        alignContent: "center",
        justifyItems: "center",
        textAlign: "center"
      }}
    >
      <LoadingRing size={56} label={text} />
      <strong style={{ fontSize: 20 }}>{text}</strong>
      <span style={{ color: "var(--muted)" }}>
        Подготавливаем данные и обновляем состояние активности.
      </span>
    </div>
  );
}

function InfoCard({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <section style={cardStyle}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
        {description}
      </p>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.72)",
        border: "1px solid var(--line)",
        display: "grid",
        gap: 6
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 14 }}>{label}</span>
      <strong style={{ fontSize: 24 }}>{value}</strong>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueFormatter
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  valueFormatter?: (value: number) => string;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span>{label}</span>
        <strong>{valueFormatter ? valueFormatter(value) : Math.round(value)}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function buttonStyle(tone: "primary" | "secondary", disabled = false) {
  return {
    border: tone === "primary" ? "none" : "1px solid var(--line)",
    borderRadius: 18,
    padding: "14px 18px",
    background: disabled
      ? "rgba(79, 45, 24, 0.18)"
      : tone === "primary"
        ? "var(--accent-strong)"
        : "white",
    color: tone === "primary" ? "white" : "var(--text)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    opacity: disabled ? 0.7 : 1
  } as const;
}

const cardStyle = {
  padding: 18,
  borderRadius: 22,
  background: "var(--surface-strong)",
  border: "1px solid var(--line)",
  display: "grid",
  gap: 14
} as const;
