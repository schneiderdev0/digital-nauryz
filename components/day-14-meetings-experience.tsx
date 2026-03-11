"use client";

import { useEffect, useState } from "react";

import type { Day14MeetingState } from "@/lib/day14";
import { LoadingRing } from "@/components/loading-ring";

const MAX_REASSIGNMENTS = 3;

type RequestState = "idle" | "loading";

export function Day14MeetingsExperience() {
  const [state, setState] = useState<Day14MeetingState | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [showCode, setShowCode] = useState(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadState = async (showSpinner = false) => {
    if (showSpinner) {
      setRequestState("loading");
    }

    const response = await fetch("/api/day14/meeting", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      setRequestState("idle");
      setState({
        isAuthenticated: false,
        isSearching: false,
        reassignmentsUsed: 0,
        pair: null
      });
      return;
    }

    const nextState = (await response.json()) as Day14MeetingState;
    setState(nextState);
    setRequestState("idle");
  };

  useEffect(() => {
    void loadState(true);
  }, []);

  useEffect(() => {
    if (!state?.isAuthenticated) {
      return;
    }

    if (!state.isSearching && (!state.pair || state.pair.status === "confirmed")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadState(false);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [state]);

  const submitAction = async (
    url: string,
    options?: RequestInit & { successMessage?: string }
  ) => {
    setRequestState("loading");
    setFeedback(null);

    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      ...options
    });
    const payload = (await response.json().catch(() => null)) as
      | Day14MeetingState
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Операция не выполнена." : "Операция не выполнена.");
      setRequestState("idle");
      return;
    }

    setState(payload as Day14MeetingState);
    setPartnerCodeInput("");
    setFeedback(options?.successMessage ?? null);
    setRequestState("idle");
  };

  if (!state) {
    return <LoadingCard text="Загружаем состояние Дня встреч..." />;
  }

  if (!state.isAuthenticated) {
    return (
      <InfoCard
        title="Требуется авторизация"
        description="Откройте приложение внутри Telegram, чтобы получить реальный профиль и участвовать в матчинге."
      />
    );
  }

  const pair = state.pair;
  const canReassign =
    Boolean(pair?.status === "matched") &&
    state.reassignmentsUsed < MAX_REASSIGNMENTS &&
    requestState === "idle";
  const canConfirm =
    Boolean(pair?.status === "matched") &&
    !pair?.confirmations.isConfirmedByMe &&
    requestState === "idle";

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <section
        style={{
          padding: 18,
          borderRadius: 22,
          background: "var(--surface-strong)",
          border: "1px solid var(--line)",
          display: "grid",
          gap: 14
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <StatusBadge
              label={
                pair
                  ? pair.status === "confirmed"
                    ? "Встреча подтверждена"
                    : "Пара собрана"
                  : state.isSearching
                    ? "Идет поиск"
                    : "Ожидает старта"
              }
              tone={pair?.status === "confirmed" ? "success" : pair || state.isSearching ? "accent" : "muted"}
            />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <strong style={{ fontSize: 20 }}>
              {pair ? "Пара на 14 марта назначена" : state.isSearching ? "Ищем второго участника" : "Матчинг еще не запущен"}
            </strong>
            <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              {pair
                ? "Найдите друг друга офлайн, покажите код встречи и подтвердите участие с двух сторон."
                : state.isSearching
                  ? "Вы уже в очереди. Как только второй участник появится, пара будет создана автоматически."
                  : "Нажмите кнопку ниже, чтобы встать в очередь и получить реальную пару с другим участником."}
            </span>
          </div>
        </div>

        {!pair && !state.isSearching ? (
          <button
            type="button"
            onClick={() =>
              void submitAction("/api/day14/meeting/match", {
                successMessage: "Вы добавлены в очередь на подбор пары."
              })
            }
            disabled={requestState === "loading"}
            style={buttonStyle("primary", requestState === "loading")}
          >
            {requestState === "loading" ? "Подключаем..." : "Найти пару"}
          </button>
        ) : null}

        {state.isSearching ? (
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              border: "1px dashed var(--line)",
              background: "rgba(255, 255, 255, 0.6)",
              display: "grid",
              gap: 8
            }}
          >
            <strong>Вы в очереди на матчинг</strong>
            <span style={{ color: "var(--muted)" }}>
              Оставьте экран открытым. Мы обновляем состояние автоматически каждые несколько секунд.
            </span>
          </div>
        ) : null}

        {pair ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "72px minmax(0, 1fr)",
                gap: 14,
                alignItems: "center",
                padding: 16,
                borderRadius: 18,
                background: "rgba(255, 255, 255, 0.72)",
                border: "1px solid rgba(79, 45, 24, 0.1)"
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: "var(--accent)",
                  color: "white",
                  fontSize: 28,
                  fontWeight: 700,
                  overflow: "hidden"
                }}
              >
                {pair.partner.avatarUrl ? (
                  <img
                    src={pair.partner.avatarUrl}
                    alt={pair.partner.displayName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  pair.partner.displayName.slice(0, 1)
                )}
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <strong style={{ fontSize: 22 }}>{pair.partner.displayName}</strong>
                <span style={{ color: "var(--muted)" }}>
                  {pair.partner.telegramUsername ? `@${pair.partner.telegramUsername}` : "username не указан"}
                </span>
                <span>Найдите этого участника и обменяйтесь кодами подтверждения.</span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10
              }}
            >
              <MetricCard label="Назначено" value={formatTime(pair.assignedAt)} />
              <MetricCard label="Подтверждений" value={`${pair.confirmations.total}/2`} />
              <MetricCard label="Перевыдач" value={`${state.reassignmentsUsed}/${MAX_REASSIGNMENTS}`} />
            </div>
          </>
        ) : null}
      </section>

      {pair ? (
        <section
          style={{
            padding: 18,
            borderRadius: 22,
            background: "var(--surface-strong)",
            border: "1px solid var(--line)",
            display: "grid",
            gap: 14
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h3 style={{ margin: 0 }}>Подтверждение встречи</h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Каждый участник видит только свой персональный код. Чтобы подтвердить встречу, нужно ввести код второго участника или позже отсканировать его QR.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCode((current) => !current)}
            style={buttonStyle("secondary")}
          >
            {showCode ? "Скрыть мой код" : "Показать мой код"}
          </button>

          {showCode ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                justifyItems: "center",
                padding: "18px 12px",
                borderRadius: 18,
                background: "white",
                border: "1px solid rgba(79, 45, 24, 0.08)"
              }}
            >
              <div
                style={{
                  width: 156,
                  height: 156,
                  borderRadius: 20,
                  border: "2px solid var(--text)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--text)",
                  textAlign: "center",
                  padding: 16,
                  overflow: "hidden"
                }}
              >
                <strong
                  style={{
                    maxWidth: "100%",
                    fontSize: 20,
                    letterSpacing: 1,
                    lineHeight: 1,
                    whiteSpace: "nowrap"
                  }}
                >
                  {pair.myConfirmationCode}
                </strong>
              </div>
              <span style={{ color: "var(--muted)", textAlign: "center" }}>
                Покажите этот код партнеру. На следующем этапе здесь будет QR с этим же токеном подтверждения.
              </span>
            </div>
          ) : null}

          {!pair.confirmations.isConfirmedByMe && pair.status === "matched" ? (
            <label style={{ display: "grid", gap: 8 }}>
              <span>Введите код, который показал партнер</span>
              <input
                value={partnerCodeInput}
                onChange={(event) => setPartnerCodeInput(event.target.value.toUpperCase())}
                placeholder="Например, A1B2C3D4"
                maxLength={8}
                style={inputStyle}
              />
            </label>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() =>
                void submitAction("/api/day14/meeting/confirm", {
                  body: JSON.stringify({ pairId: pair.id, partnerCode: partnerCodeInput }),
                  successMessage:
                    pair.confirmations.total >= 1
                      ? "Ваше подтверждение сохранено."
                      : "Первое подтверждение сохранено. Ждем второго участника."
                })
              }
              disabled={!canConfirm}
              style={buttonStyle("primary", !canConfirm)}
            >
              {pair.confirmations.isConfirmedByMe ? "Вы уже подтвердили встречу" : "Подтвердить по коду партнера"}
            </button>
            <button
              type="button"
              onClick={() =>
                void submitAction("/api/day14/meeting/reassign", {
                  successMessage: "Старая пара закрыта. Запускаем новый подбор."
                })
              }
              disabled={!canReassign}
              style={buttonStyle("secondary", !canReassign)}
            >
              Получить новую пару
            </button>
          </div>

          {pair.status === "confirmed" ? (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 16,
                background: "rgba(47, 122, 82, 0.12)",
                color: "var(--success)"
              }}
            >
              Встреча подтверждена обеими сторонами. По 50 очков уже начислены в рейтинг.
            </div>
          ) : pair.confirmations.isConfirmedByMe ? (
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 16,
                background: "rgba(244, 209, 122, 0.28)",
                color: "var(--accent-strong)"
              }}
            >
              Ваше подтверждение сохранено. Как только второй участник нажмет кнопку, пара закроется автоматически.
            </div>
          ) : null}
        </section>
      ) : null}

      {feedback ? (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 16,
            background: "rgba(255, 255, 255, 0.72)",
            border: "1px solid var(--line)"
          }}
        >
          {feedback}
        </div>
      ) : null}
    </section>
  );
}

function LoadingCard({ text }: { text: string }) {
  return (
    <section
      style={{
        padding: 18,
        borderRadius: 22,
        background: "var(--surface-strong)",
        border: "1px solid var(--line)",
        minHeight: 220,
        display: "grid",
        alignContent: "center",
        justifyItems: "center",
        gap: 12,
        textAlign: "center"
      }}
    >
      <LoadingRing size={56} label={text} />
      <strong style={{ fontSize: 20 }}>{text}</strong>
      <span style={{ color: "var(--muted)" }}>
        Подготавливаем данные и обновляем состояние активности.
      </span>
    </section>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <section
      style={{
        padding: 18,
        borderRadius: 22,
        background: "var(--surface-strong)",
        border: "1px solid var(--line)",
        display: "grid",
        gap: 8
      }}
    >
      <strong style={{ fontSize: 20 }}>{title}</strong>
      <span style={{ color: "var(--muted)" }}>{description}</span>
    </section>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "accent" | "success" | "muted" }) {
  const styles = {
    accent: {
      background: "rgba(244, 209, 122, 0.28)",
      color: "var(--accent-strong)"
    },
    success: {
      background: "rgba(47, 122, 82, 0.12)",
      color: "var(--success)"
    },
    muted: {
      background: "rgba(255, 255, 255, 0.72)",
      color: "var(--muted)"
    }
  }[tone];

  return (
    <span
      style={{
        padding: "8px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        fontSize: 13,
        fontWeight: 700,
        ...styles
      }}
    >
      {label}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        background: "rgba(255, 255, 255, 0.72)",
        border: "1px solid rgba(79, 45, 24, 0.08)",
        display: "grid",
        gap: 6
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 12 }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buttonStyle(kind: "primary" | "secondary", disabled = false) {
  if (kind === "primary") {
    return {
      borderRadius: 16,
      padding: "12px 16px",
      border: "1px solid transparent",
      background: "var(--accent-strong)",
      color: "white",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1
    };
  }

  return {
    borderRadius: 16,
    padding: "12px 16px",
    border: "1px solid var(--line)",
    background: "rgba(255, 255, 255, 0.72)",
    color: "var(--text)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1
  };
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "white",
  color: "var(--text)",
  textTransform: "uppercase" as const
};

function formatTime(isoString: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoString));
}
