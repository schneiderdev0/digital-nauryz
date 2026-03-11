"use client";

import { useEffect, useRef, useState } from "react";

import { LoadingRing } from "@/components/loading-ring";
import type { Day20RaceRoom, Day20State } from "@/lib/day20";

type RequestState = "idle" | "loading";
type LocalMode = "solo" | "pvp";
type SoloStatus = "idle" | "racing" | "finishing";

const SOLO_FRAME_MS = 100;
const PVP_POLL_MS = 700;
const PVP_FLUSH_MS = 180;

export function Day20SportsExperience() {
  const [state, setState] = useState<Day20State | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [mode, setMode] = useState<LocalMode>("solo");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [soloStatus, setSoloStatus] = useState<SoloStatus>("idle");
  const [soloTaps, setSoloTaps] = useState(0);
  const [soloTimeLeftMs, setSoloTimeLeftMs] = useState(0);
  const [optimisticPvpTaps, setOptimisticPvpTaps] = useState<number | null>(null);

  const soloDeadlineRef = useRef<number | null>(null);
  const soloTapsRef = useRef(0);
  const pendingPvpTapsRef = useRef(0);

  const loadState = async (showSpinner = false) => {
    if (showSpinner) {
      setRequestState("loading");
    }

    const response = await fetch("/api/day20", {
      credentials: "same-origin"
    });
    const payload = (await response.json().catch(() => null)) as
      | Day20State
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setRequestState("idle");
      return;
    }

    setState(payload as Day20State);
    setRequestState("idle");
  };

  useEffect(() => {
    void loadState(true);
  }, []);

  useEffect(() => {
    if (!state?.room) {
      setOptimisticPvpTaps(null);
      return;
    }

    setOptimisticPvpTaps(state.room.myTapCount);
  }, [state?.room?.id, state?.room?.myTapCount]);

  useEffect(() => {
    if (!state?.room || state.room.status === "finished") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadState(false);
    }, PVP_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [state?.room?.id, state?.room?.status]);

  useEffect(() => {
    if (soloStatus !== "racing") {
      return;
    }

    const intervalId = window.setInterval(() => {
      const deadline = soloDeadlineRef.current;
      if (!deadline) {
        return;
      }

      const nextRemaining = Math.max(0, deadline - Date.now());
      setSoloTimeLeftMs(nextRemaining);

      if (nextRemaining === 0) {
        window.clearInterval(intervalId);
        void finishSoloRun();
      }
    }, SOLO_FRAME_MS);

    return () => window.clearInterval(intervalId);
  }, [soloStatus]);

  useEffect(() => {
    if (!state?.room || state.room.status !== "racing") {
      pendingPvpTapsRef.current = 0;
      return;
    }

    const intervalId = window.setInterval(() => {
      const pending = pendingPvpTapsRef.current;
      if (!pending || !state.room) {
        return;
      }

      pendingPvpTapsRef.current = 0;

      void fetch("/api/day20/pvp/tap", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          roomId: state.room.id,
          tapCount: pending
        })
      }).then(() => loadState(false));
    }, PVP_FLUSH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state?.room?.id, state?.room?.status]);

  const finishSoloRun = async () => {
    setSoloStatus("finishing");

    const response = await fetch("/api/day20/solo", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ taps: soloTapsRef.current })
    });
    const payload = (await response.json().catch(() => null)) as
      | Day20State
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback("Не удалось сохранить результат соло-заезда.");
      setSoloStatus("idle");
      return;
    }

    setState(payload as Day20State);
    setFeedback("Соло-заезд завершен. Личный рекорд обновлен.");
    setSoloStatus("idle");
  };

  const startSoloRun = () => {
    soloTapsRef.current = 0;
    setSoloTaps(0);
    setFeedback(null);
    setSoloTimeLeftMs((state?.soloDurationSeconds ?? 10) * 1000);
    soloDeadlineRef.current =
      Date.now() + (state?.soloDurationSeconds ?? 10) * 1000;
    setSoloStatus("racing");
  };

  const tapSolo = () => {
    if (soloStatus !== "racing") {
      return;
    }

    soloTapsRef.current += 1;
    setSoloTaps(soloTapsRef.current);
  };

  const createRace = async () => {
    setRequestState("loading");
    setFeedback(null);

    const response = await fetch("/api/day20/pvp/create", {
      method: "POST",
      credentials: "same-origin"
    });
    const payload = (await response.json().catch(() => null)) as
      | Day20State
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Не удалось создать гонку." : "Не удалось создать гонку.");
      setRequestState("idle");
      return;
    }

    setState(payload as Day20State);
    setMode("pvp");
    setFeedback("Комната создана. Пригласите второго участника по коду.");
    setRequestState("idle");
  };

  const joinRace = async () => {
    setRequestState("loading");
    setFeedback(null);

    const response = await fetch("/api/day20/pvp/join", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ inviteCode: inviteCodeInput })
    });
    const payload = (await response.json().catch(() => null)) as
      | Day20State
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Не удалось войти в гонку." : "Не удалось войти в гонку.");
      setRequestState("idle");
      return;
    }

    setState(payload as Day20State);
    setMode("pvp");
    setFeedback("Вы подключились к гонке.");
    setRequestState("idle");
  };

  const shareInviteCode = async (room: Day20RaceRoom) => {
    const text = `Подключайся к гонке в Цифровом Наурызе. Код комнаты: ${room.inviteCode}`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        void 0;
      }
    }

    try {
      await navigator.clipboard.writeText(room.inviteCode);
      setFeedback("Код скопирован в буфер обмена.");
    } catch {
      setFeedback("Скопируйте код вручную: " + room.inviteCode);
    }
  };

  const tapPvp = () => {
    if (!state?.room || state.room.status !== "racing") {
      return;
    }

    pendingPvpTapsRef.current += 1;
    setOptimisticPvpTaps((current) => (current ?? state.room?.myTapCount ?? 0) + 1);
  };

  const soloProgress = Math.min(100, (soloTaps / 60) * 100);
  const pvpRoom = state?.room ?? null;
  const myPvpTaps = optimisticPvpTaps ?? pvpRoom?.myTapCount ?? 0;
  const maxPvpTaps = Math.max(myPvpTaps, pvpRoom?.opponentTapCount ?? 0, 1);

  if (!state) {
    return <LoadingCard text="Загружаем День спорта..." />;
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 20 }}>Гонка на лошадях</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Тренируйтесь в соло или выходите в PvP. Вторая лошадь подключается
            по коду комнаты, а победитель PvP получает {state.rewardPoints} очков.
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
            gap: 10
          }}
        >
          <MetricCard label="PvP бонус" value={`+${state.rewardPoints}`} />
          <MetricCard label="Соло рекорд" value={String(state.soloBestTaps)} />
          <MetricCard
            label="Заезд"
            value={
              pvpRoom
                ? pvpRoom.status === "waiting"
                  ? "Сбор"
                  : pvpRoom.status === "racing"
                    ? "Идет"
                    : "Финиш"
                : "Нет"
            }
          />
        </div>
      </section>

      {!state.isAuthenticated ? (
        <InfoCard
          title="Требуется авторизация"
          description="Откройте приложение внутри Telegram, чтобы участвовать в гонке и сохранять свои результаты."
        />
      ) : null}

      {state.isAuthenticated ? (
        <>
          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={modeTabsStyle}>
                <button
                  type="button"
                  onClick={() => setMode("solo")}
                  style={modeButtonStyle(mode === "solo")}
                >
                  Соло
                </button>
                <button
                  type="button"
                  onClick={() => setMode("pvp")}
                  style={modeButtonStyle(mode === "pvp")}
                >
                  PvP
                </button>
              </div>

              {mode === "solo" ? (
                <section style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <h3 style={{ margin: 0 }}>Соло-заезд</h3>
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                      За {state.soloDurationSeconds} секунд набейте как можно больше
                      тапов и обновите свой личный рекорд.
                    </p>
                  </div>

                  <RaceTrack
                    title="Ваш темп"
                    progress={soloProgress}
                    taps={soloTaps}
                    accent="var(--accent-strong)"
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 10
                    }}
                  >
                    <MetricCard
                      label="Осталось"
                      value={
                        soloStatus === "racing"
                          ? (soloTimeLeftMs / 1000).toFixed(1)
                          : String(state.soloDurationSeconds)
                      }
                    />
                    <MetricCard label="Последний заезд" value={String(state.soloLastTaps)} />
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => startSoloRun()}
                      disabled={soloStatus === "racing" || soloStatus === "finishing"}
                      style={buttonStyle("secondary", soloStatus === "racing" || soloStatus === "finishing")}
                    >
                      {soloStatus === "racing" ? "Заезд идет" : "Старт соло"}
                    </button>
                    <button
                      type="button"
                      onClick={() => tapSolo()}
                      disabled={soloStatus !== "racing"}
                      style={buttonStyle("primary", soloStatus !== "racing")}
                    >
                      Тап по лошади
                    </button>
                  </div>
                </section>
              ) : (
                <section style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <h3 style={{ margin: 0 }}>PvP-гонка</h3>
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                      Два участника подключаются к одной комнате. После старта у вас {state.pvpDurationSeconds} секунд на спринт.
                    </p>
                  </div>

                  {!pvpRoom ? (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 10
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => void createRace()}
                          disabled={requestState === "loading"}
                          style={buttonStyle("primary", requestState === "loading")}
                        >
                          {requestState === "loading" ? "Создаем..." : "Создать комнату"}
                        </button>
                        <input
                          value={inviteCodeInput}
                          onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
                          placeholder="Код комнаты"
                          maxLength={6}
                          style={fieldStyle}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void joinRace()}
                        disabled={requestState === "loading" || inviteCodeInput.trim().length < 6}
                        style={buttonStyle("secondary", requestState === "loading" || inviteCodeInput.trim().length < 6)}
                      >
                        {requestState === "loading" ? "Подключаем..." : "Войти по коду"}
                      </button>
                    </>
                  ) : pvpRoom.status === "waiting" ? (
                    <>
                      <div style={inviteCardStyle}>
                        <span style={{ color: "var(--muted)" }}>Код комнаты</span>
                        <strong style={{ fontSize: 34, letterSpacing: 3 }}>{pvpRoom.inviteCode}</strong>
                        <span style={{ color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
                          Отправьте код второму участнику. Гонка стартует автоматически, как только он подключится.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void shareInviteCode(pvpRoom)}
                        style={buttonStyle("secondary")}
                      >
                        Поделиться кодом
                      </button>
                    </>
                  ) : pvpRoom.status === "finished" ? (
                    <>
                      <ResultBadge room={pvpRoom} />

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: 10
                        }}
                      >
                        <MetricCard label="Ваши тапы" value={String(pvpRoom.myTapCount)} />
                        <MetricCard label="Тапы соперника" value={String(pvpRoom.opponentTapCount)} />
                      </div>

                      <button
                        type="button"
                        onClick={() => void createRace()}
                        disabled={requestState === "loading"}
                        style={buttonStyle("primary", requestState === "loading")}
                      >
                        {requestState === "loading" ? "Создаем..." : "Новый заезд"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: 10
                        }}
                      >
                        <MetricCard
                          label="До финиша"
                          value={
                            pvpRoom.endsAt
                              ? Math.max(
                                  0,
                                  (new Date(pvpRoom.endsAt).getTime() - Date.now()) / 1000
                                ).toFixed(1)
                              : "0.0"
                          }
                        />
                        <MetricCard
                          label="Соперник"
                          value={pvpRoom.members.find((member) => !member.isMe)?.displayName ?? "Ждем"}
                        />
                      </div>

                      <RaceTrack
                        title="Вы"
                        progress={(myPvpTaps / maxPvpTaps) * 100}
                        taps={myPvpTaps}
                        accent="var(--accent-strong)"
                      />
                      <RaceTrack
                        title={pvpRoom.members.find((member) => !member.isMe)?.displayName ?? "Соперник"}
                        progress={((pvpRoom.opponentTapCount ?? 0) / maxPvpTaps) * 100}
                        taps={pvpRoom.opponentTapCount}
                        accent="#2b7a63"
                      />

                      <button
                        type="button"
                        onClick={() => tapPvp()}
                        style={buttonStyle("primary")}
                      >
                        Тап по лошади
                      </button>
                    </>
                  )}
                </section>
              )}
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Лидеры дня</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Рейтинг собирается из PvP-побед и лучших соло-результатов.
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {state.leaderboard.length ? (
                state.leaderboard.map((entry) => (
                  <div key={entry.userId} style={leaderboardRowStyle}>
                    <strong>#{entry.rank}</strong>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block" }}>{entry.displayName}</strong>
                      <span style={{ color: "var(--muted)", overflowWrap: "anywhere" }}>
                        Соло: {entry.soloBestTaps} | PvP побед: {entry.pvpWins}
                      </span>
                    </div>
                    <strong>{entry.score}</strong>
                  </div>
                ))
              ) : (
                <span style={{ color: "var(--muted)" }}>
                  Пока нет завершенных заездов. Станьте первым участником дня.
                </span>
              )}
            </div>
          </section>
        </>
      ) : null}

      {feedback ? (
        <div style={feedbackStyle}>
          {feedback}
        </div>
      ) : null}
    </section>
  );
}

function ResultBadge({ room }: { room: Day20RaceRoom }) {
  const me = room.members.find((member) => member.isMe) ?? null;
  const isWinner = me?.userId && room.winnerId === me.userId;
  const isDraw = !room.winnerId;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: isDraw ? "rgba(57, 34, 16, 0.06)" : isWinner ? "rgba(57, 122, 73, 0.12)" : "rgba(179, 73, 16, 0.08)",
        border: "1px solid var(--line)",
        display: "grid",
        gap: 6,
        textAlign: "center"
      }}
    >
      <strong style={{ fontSize: 22 }}>
        {isDraw ? "Ничья" : isWinner ? "Победа" : "Финиш"}
      </strong>
      <span style={{ color: "var(--muted)" }}>
        {isDraw
          ? "Вы оба пришли к финишу с одинаковым результатом."
          : isWinner
            ? "Вы выиграли гонку и забрали очки дня."
            : "Соперник оказался быстрее в этом заезде."}
      </span>
    </div>
  );
}

function RaceTrack({
  title,
  progress,
  taps,
  accent
}: {
  title: string;
  progress: number;
  taps: number;
  accent: string;
}) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 20,
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.74)",
        display: "grid",
        gap: 12
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong>{title}</strong>
        <span style={{ color: "var(--muted)" }}>{taps} тапов</span>
      </div>

      <div
        style={{
          height: 52,
          borderRadius: 999,
          background: "rgba(57, 34, 16, 0.08)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${clamped}%`,
            background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.18))`,
            opacity: 0.2
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `calc(${clamped}% - 22px)`,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 30,
            lineHeight: 1
          }}
        >
          🐎
        </div>
      </div>
    </div>
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
        Подключаем таблицу лидеров и готовим заезды дня.
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
        background: "rgba(255,255,255,0.72)",
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

function modeButtonStyle(active: boolean) {
  return {
    padding: "12px 16px",
    borderRadius: 16,
    border: active ? "none" : "1px solid var(--line)",
    background: active ? "var(--accent-strong)" : "white",
    color: active ? "white" : "var(--text)",
    fontWeight: 600,
    cursor: "pointer"
  } as const;
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

const cardStyle = {
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 24,
  background: "rgba(255,255,255,0.72)",
  border: "1px solid var(--line)"
} as const;

const fieldStyle = {
  width: "100%",
  padding: 16,
  borderRadius: 20,
  border: "1px solid var(--line)",
  background: "white",
  color: "var(--text)",
  font: "inherit"
} as const;

const inviteCardStyle = {
  padding: 18,
  borderRadius: 20,
  background: "rgba(255,255,255,0.74)",
  border: "1px solid var(--line)",
  display: "grid",
  gap: 6,
  justifyItems: "center"
} as const;

const modeTabsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10
} as const;

const leaderboardRowStyle = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
  padding: 14,
  borderRadius: 18,
  border: "1px solid var(--line)",
  background: "rgba(255,255,255,0.72)"
} as const;

const feedbackStyle = {
  padding: 14,
  borderRadius: 18,
  background: "rgba(179, 73, 16, 0.08)",
  color: "var(--text)",
  border: "1px solid rgba(179, 73, 16, 0.14)"
} as const;
