"use client";

import { useEffect, useMemo, useState } from "react";

import { LoadingRing } from "@/components/loading-ring";
import {
  DAY19_TREES,
  type Day19State,
  type Day19TreeId
} from "@/lib/day19";

type RequestState = "idle" | "loading" | "saving";

export function Day19RenewalExperience() {
  const [state, setState] = useState<Day19State | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [goal, setGoal] = useState("");
  const [treeId, setTreeId] = useState<Day19TreeId>(DAY19_TREES[0].id);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const selectedTree =
    DAY19_TREES.find((tree) => tree.id === treeId) ?? DAY19_TREES[0];
  const displayName = state?.isAuthenticated ? state.displayName : "Ваше имя";

  useEffect(() => {
    const loadState = async () => {
      setRequestState("loading");

      const response = await fetch("/api/day19", {
        credentials: "same-origin"
      });
      const payload = (await response.json().catch(() => null)) as
        | Day19State
        | { error?: string }
        | null;

      if (!response.ok || !payload || "error" in payload) {
        setRequestState("idle");
        return;
      }

      const nextState = payload as Day19State;
      setState(nextState);
      setGoal(nextState.goal);
      setTreeId(nextState.treeId);
      setRequestState("idle");
    };

    void loadState();
  }, []);

  const svgMarkup = useMemo(
    () =>
      buildDay19CardSvg({
        displayName,
        goal: goal.trim() || "Моя цель на этот год",
        treeId
      }),
    [displayName, goal, treeId]
  );
  const svgDataUrl = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
    [svgMarkup]
  );

  const saveCard = async () => {
    if (!state?.isAuthenticated) {
      return;
    }

    if (!goal.trim()) {
      setFeedback("Напишите цель на год, чтобы сохранить карточку.");
      return;
    }

    setRequestState("saving");
    setFeedback(null);

    const response = await fetch("/api/day19/save", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        goal,
        treeId
      })
    });

    const payload = (await response.json().catch(() => null)) as
      | Day19State
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(
        payload && "error" in payload
          ? payload.error ?? "Не удалось сохранить карточку."
          : "Не удалось сохранить карточку."
      );
      setRequestState("idle");
      return;
    }

    const nextState = payload as Day19State;
    setState(nextState);
    setGoal(nextState.goal);
    setTreeId(nextState.treeId);
    setFeedback("Карточка обновлена и цель сохранена.");
    setRequestState("idle");
  };

  const shareCard = async () => {
    if (isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      await shareDay19Card(svgMarkup, selectedTree.name);
    } catch {
      setFeedback("Не удалось открыть меню отправки карточки.");
    } finally {
      setIsSharing(false);
    }
  };

  if (!state) {
    return <LoadingCard text="Загружаем День обновления..." />;
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 20 }}>Посадите цифровое дерево</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Запишите свою цель на год, выберите стиль дерева и сохраните
            карточку с именем. За первую завершенную карточку начисляется{" "}
            {state.rewardPoints} очков.
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
            gap: 10
          }}
        >
          <MetricCard label="Бонус" value={`+${state.rewardPoints}`} />
          <MetricCard
            label="Статус"
            value={state.hasCreatedCard ? "Создано" : "Ожидает"}
          />
          <MetricCard
            label="Выбор"
            value={selectedTree.name}
          />
        </div>
      </section>

      {!state.isAuthenticated ? (
        <InfoCard
          title="Требуется авторизация"
          description="Откройте приложение внутри Telegram, чтобы сохранить свою цель, получить очки и скачать личную карточку."
        />
      ) : null}

      {state.isAuthenticated ? (
        <>
          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Цель на год</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Напишите коротко и конкретно, к чему вы хотите прийти в этом году.
              </p>
            </div>

            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value.slice(0, 180))}
              placeholder="Например: развить новый навык, завершить важный проект или больше времени уделять семье."
              rows={5}
              style={textareaStyle}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                color: "var(--muted)",
                fontSize: 14
              }}
            >
              <span>{displayName}</span>
              <span>{goal.length}/180</span>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Выберите дерево</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Каждый стиль создает свою атмосферу карточки.
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {DAY19_TREES.map((tree) => (
                <button
                  key={tree.id}
                  type="button"
                  onClick={() => setTreeId(tree.id)}
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border:
                      tree.id === treeId
                        ? "2px solid var(--accent-strong)"
                        : "1px solid var(--line)",
                    background:
                      tree.id === treeId
                        ? "rgba(179, 73, 16, 0.08)"
                        : "white",
                    textAlign: "left",
                    display: "grid",
                    gap: 6,
                    cursor: "pointer"
                  }}
                >
                  <strong>{tree.name}</strong>
                  <span style={{ color: "var(--muted)" }}>{tree.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Карточка обновления</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Сохраните карточку, скачайте ее или отправьте дальше.
              </p>
            </div>

            <img
              src={svgDataUrl}
              alt="Цифровое дерево с целью"
              style={{
                width: "100%",
                borderRadius: 22,
                border: "1px solid var(--line)",
                display: "block",
                background: "white"
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10
              }}
            >
              <button
                type="button"
                onClick={() => void shareCard()}
                disabled={isSharing}
                style={buttonStyle("secondary", isSharing)}
              >
                {isSharing ? "Открываем..." : "Поделиться"}
              </button>
            </div>
          </section>
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

function buildDay19CardSvg({
  displayName,
  goal,
  treeId
}: {
  displayName: string;
  goal: string;
  treeId: Day19TreeId;
}) {
  const theme =
    treeId === "sunrise"
      ? {
          background: ["#fff0d4", "#f6d6a2"],
          soil: "#8f4a22",
          trunk: "#83431f",
          leafA: "#f3a63d",
          leafB: "#df7044",
          accent: "#8b2f1a"
        }
      : treeId === "night"
        ? {
            background: ["#10243d", "#1d3b57"],
            soil: "#493224",
            trunk: "#7e5531",
            leafA: "#4cb388",
            leafB: "#8bd3f7",
            accent: "#dff6ff"
          }
        : {
            background: ["#eef6df", "#dcebc5"],
            soil: "#8c5b32",
            trunk: "#7c4a24",
            leafA: "#71be66",
            leafB: "#9fda73",
            accent: "#395a2a"
          };

  const safeGoal = escapeXml(goal);
  const safeName = escapeXml(displayName);
  const quoteLines = splitText(goal, 28).slice(0, 4);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${theme.background[0]}" />
          <stop offset="100%" stop-color="${theme.background[1]}" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1350" rx="52" fill="url(#bg)" />
      <rect x="52" y="52" width="976" height="1246" rx="44" fill="rgba(255,255,255,0.28)" stroke="rgba(57,34,16,0.12)" />
      <text x="96" y="140" fill="${theme.accent}" font-size="44" font-family="Georgia, serif">19 марта</text>
      <text x="96" y="248" fill="#2d1a0f" font-size="88" font-weight="700" font-family="Georgia, serif">День обновления</text>
      <text x="96" y="314" fill="rgba(45,26,15,0.68)" font-size="34" font-family="Arial, sans-serif">Цифровое дерево и цель на год</text>
      <g transform="translate(540 650)">
        <ellipse cx="0" cy="300" rx="250" ry="54" fill="rgba(84,49,23,0.14)" />
        <path d="M-180 270 C-120 250 120 250 180 270 C130 330 -130 330 -180 270 Z" fill="${theme.soil}" opacity="0.92" />
        <path d="M-36 250 C-26 130 -14 30 0 -120 C18 30 30 130 42 250 Z" fill="${theme.trunk}" />
        <path d="M-14 16 C-92 -86 -160 -90 -164 -8 C-168 72 -84 88 -30 34 Z" fill="${theme.leafA}" />
        <path d="M10 8 C84 -92 162 -92 170 -8 C176 72 88 92 24 40 Z" fill="${theme.leafB}" />
        <path d="M-132 -10 C-84 -142 84 -146 132 -10 C160 74 84 138 0 140 C-84 138 -164 72 -132 -10 Z" fill="${theme.leafA}" opacity="0.9" />
        <path d="M-64 -92 C-28 -158 28 -158 64 -92 C88 -48 58 12 0 20 C-56 12 -90 -48 -64 -92 Z" fill="${theme.leafB}" opacity="0.9" />
        <circle cx="-92" cy="-26" r="16" fill="rgba(255,255,255,0.34)" />
        <circle cx="104" cy="-10" r="14" fill="rgba(255,255,255,0.28)" />
        <circle cx="14" cy="-122" r="12" fill="rgba(255,255,255,0.22)" />
      </g>
      <text x="96" y="930" fill="${theme.accent}" font-size="32" font-family="Arial, sans-serif">Имя</text>
      <text x="96" y="986" fill="#2d1a0f" font-size="62" font-weight="700" font-family="Arial, sans-serif">${safeName}</text>
      <text x="96" y="1070" fill="${theme.accent}" font-size="32" font-family="Arial, sans-serif">Моя цель</text>
      ${quoteLines
        .map(
          (line, index) =>
            `<text x="96" y="${1132 + index * 54}" fill="#2d1a0f" font-size="42" font-family="Arial, sans-serif">${escapeXml(
              line
            )}</text>`
        )
        .join("")}
      <text x="96" y="1260" fill="rgba(45,26,15,0.55)" font-size="28" font-family="Arial, sans-serif">${safeGoal}</text>
    </svg>
  `;
}

function splitText(value: string, maxLength: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
      return;
    }

    current = next;
  });

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [value];
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function shareDay19Card(svgMarkup: string, treeName: string) {
  const file = await createDay19PngFile(svgMarkup, treeName);

  if (navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file]
        });
        return;
      }

      await navigator.share({});
      return;
    } catch (error) {
      if (isShareCanceled(error)) {
        return;
      }

      throw error;
    }
  }

  throw new Error("Sharing is not supported.");
}

async function downloadDay19Card(svgMarkup: string, treeName: string) {
  const file = await createDay19PngFile(svgMarkup, treeName);

  if (navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file]
        });
        return "shared" as const;
      }
    } catch {
      void 0;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  return "downloaded" as const;
}

async function createDay19PngFile(svgMarkup: string, treeName: string) {
  const blob = await renderSvgToPngBlob(svgMarkup);
  return new File([blob], `nauryz-tree-${slugifyFilename(treeName)}.png`, {
    type: "image/png"
  });
}

async function renderSvgToPngBlob(svgMarkup: string) {
  const svgBlob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8"
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 1080;
    canvas.height = image.naturalHeight || 1350;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png");
    });

    if (!blob) {
      throw new Error("Failed to export card.");
    }

    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = src;
  });
}

function slugifyFilename(value: string) {
  return value.trim().toLowerCase().replaceAll(/\s+/g, "-");
}

function isShareCanceled(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.message.toLowerCase().includes("abort") ||
    error.message.toLowerCase().includes("cancel")
  );
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
        Подготавливаем карточку и загружаем состояние активности.
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
      <strong
        style={{
          fontSize: 22,
          lineHeight: 1.1,
          overflowWrap: "anywhere",
          wordBreak: "break-word"
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function buttonStyle(kind: "primary" | "secondary", disabled = false) {
  return {
    padding: "14px 18px",
    borderRadius: 18,
    border: kind === "primary" ? "none" : "1px solid var(--line)",
    background:
      kind === "primary"
        ? disabled
          ? "rgba(179, 73, 16, 0.45)"
          : "var(--accent-strong)"
        : "white",
    color: kind === "primary" ? "white" : "var(--text)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    opacity: disabled ? 0.85 : 1,
    minHeight: 56,
    lineHeight: 1.2,
    whiteSpace: "normal",
    textAlign: "center"
  } as const;
}

const textareaStyle = {
  width: "100%",
  resize: "vertical",
  minHeight: 132,
  padding: 16,
  borderRadius: 20,
  border: "1px solid var(--line)",
  background: "white",
  color: "var(--text)",
  font: "inherit",
  lineHeight: 1.6
} as const;

const cardStyle = {
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 24,
  background: "rgba(255, 255, 255, 0.72)",
  border: "1px solid var(--line)"
} as const;
