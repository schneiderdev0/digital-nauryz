"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import type { Day14MeetingState } from "@/lib/day14";
import { LoadingRing } from "@/components/loading-ring";

const MAX_REASSIGNMENTS = 3;

type RequestState = "idle" | "loading";

export function Day14MeetingsExperience({ locale: _locale = "ru" }: { locale?: AppLocale }) {
  const [state, setState] = useState<Day14MeetingState | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [showQr, setShowQr] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [messageState, setMessageState] = useState<RequestState>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

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

    if (!state.isSearching && !state.pair) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadState(false);
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [state]);

  useEffect(() => {
    const pair = state?.pair;

    if (!pair || !showQr) {
      setQrDataUrl(null);
      return;
    }

    void QRCode.toDataURL(pair.myQrPayload, {
      width: 220,
      margin: 1,
      color: {
        dark: "#2e1b10",
        light: "#fffdf9"
      }
    }).then(setQrDataUrl);
  }, [showQr, state?.pair]);

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
    setFeedback(options?.successMessage ?? null);
    setRequestState("idle");
  };

  const sendMessage = async () => {
    if (!state?.pair || !messageInput.trim()) {
      return;
    }

    setMessageState("loading");
    setFeedback(null);

    const response = await fetch("/api/day14/meeting/message", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        pairId: state.pair.id,
        text: messageInput
      })
    });
    const payload = (await response.json().catch(() => null)) as
      | Day14MeetingState
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Сообщение не отправлено." : "Сообщение не отправлено.");
      setMessageState("idle");
      return;
    }

    setState(payload as Day14MeetingState);
    setMessageInput("");
    setMessageState("idle");
  };

  const scanPartnerQr = async () => {
    const pair = state?.pair;
    const webApp = (window as Window & {
      Telegram?: {
        WebApp?: {
          showScanQrPopup?: (
            params: { text?: string },
            callback: (value: string) => boolean | void
          ) => void;
          closeScanQrPopup?: () => void;
        };
      };
    }).Telegram?.WebApp;

    if (!pair) {
      return;
    }

    if (!webApp?.showScanQrPopup) {
      setFeedback("В этом клиенте Telegram сканер QR недоступен. Подтверждение встречи работает только через QR.");
      return;
    }

    webApp.showScanQrPopup(
      {
        text: "Наведите камеру на QR-код участника, чтобы подтвердить встречу."
      },
      (value) => {
        webApp.closeScanQrPopup?.();
        void submitAction("/api/day14/meeting/confirm", {
          body: JSON.stringify({ pairId: pair.id, scannedPayload: value }),
          successMessage: "QR партнера считан. Встреча подтверждена."
        });
        return true;
      }
    );
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
    requestState === "idle";
  const messageCountLabel = pair ? String(pair.messages.length) : "0";
  const canSendMessage = Boolean(pair && messageInput.trim() && messageState === "idle");
  const partnerSearchLabel = pair?.partner.telegramUsername
    ? `Напишите @${pair.partner.telegramUsername} в чате ниже и договоритесь, где встретиться.`
    : "Напишите партнеру в чат ниже и договоритесь о месте встречи на площадке.";

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
                ? "Найдите друг друга на площадке, обменяйтесь сообщениями в чате и подтвердите встречу одним сканированием QR."
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
                <span>{partnerSearchLabel}</span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 10
              }}
            >
              <MetricCard label="Назначено" value={formatTime(pair.assignedAt)} />
              <MetricCard label="Статус" value={pair.status === "confirmed" ? "QR считан" : "Ждет скан"} />
              <MetricCard label="Сообщений" value={messageCountLabel} />
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
              У каждого участника есть свой QR. Встреча считается подтвержденной сразу после того, как один из вас считает QR второго участника.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowQr((current) => !current)}
            style={buttonStyle("secondary")}
          >
            {showQr ? "Скрыть мой QR" : "Показать мой QR"}
          </button>

          {showQr ? (
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
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR-код подтверждения встречи"
                  style={{
                    width: 176,
                    height: 176,
                    borderRadius: 20,
                    border: "2px solid var(--text)",
                    background: "white",
                    objectFit: "contain",
                    padding: 10
                  }}
                />
              ) : (
                <LoadingRing size={48} label="Генерируем QR" />
              )}
              <span style={{ color: "var(--muted)", textAlign: "center" }}>
                Покажите этот QR партнеру, чтобы он мог подтвердить встречу сканированием.
              </span>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void scanPartnerQr()}
              disabled={!canConfirm}
              style={buttonStyle("primary", !canConfirm)}
            >
              Сканировать QR партнера
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
              QR считан, встреча подтверждена. По 50 очков уже начислены обоим участникам.
            </div>
          ) : null}
        </section>
      ) : null}

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
            <h3 style={{ margin: 0 }}>Чат пары</h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Напишите партнеру, чтобы быстрее найти друг друга на площадке.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              maxHeight: 280,
              overflowY: "auto",
              paddingRight: 4
            }}
          >
            {pair.messages.length ? (
              pair.messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    justifySelf: message.isMine ? "end" : "start",
                    maxWidth: "82%",
                    padding: "12px 14px",
                    borderRadius: 16,
                    background: message.isMine
                      ? "rgba(179, 73, 16, 0.12)"
                      : "rgba(255, 255, 255, 0.82)",
                    border: "1px solid var(--line)",
                    display: "grid",
                    gap: 4
                  }}
                >
                  <strong style={{ fontSize: 13 }}>
                    {message.isMine ? "Вы" : message.senderName}
                  </strong>
                  <span style={{ overflowWrap: "anywhere", lineHeight: 1.45 }}>
                    {message.text}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    {formatMessageTime(message.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ color: "var(--muted)" }}>
                Сообщений пока нет. Напишите первым и предложите место встречи.
              </span>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <textarea
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Например: Я у сцены рядом со стойкой регистрации."
              maxLength={500}
              style={{
                ...inputStyle,
                minHeight: 110,
                resize: "vertical",
                textTransform: "none"
              }}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!canSendMessage}
              style={buttonStyle("primary", !canSendMessage)}
            >
              {messageState === "loading" ? "Отправляем..." : "Отправить сообщение"}
            </button>
          </div>
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

function formatMessageTime(isoString: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoString));
}
import type { AppLocale } from "@/lib/locale";
