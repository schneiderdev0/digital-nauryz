"use client";

import { useEffect, useMemo, useState } from "react";

import {
  KINDNESS_TEMPLATES,
  type Day15Recipient,
  type Day15RecipientsPage,
  type Day15State
} from "@/lib/day15";
import { LoadingRing } from "@/components/loading-ring";

type RequestState = "idle" | "loading";
const RECEIVED_SEEN_STORAGE_KEY = "digital-nauryz:day15:received-seen";
const RECIPIENTS_PAGE_SIZE = 12;

export function Day15KindnessExperience({ locale: _locale = "ru" }: { locale?: AppLocale }) {
  const [state, setState] = useState<Day15State | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [recipientId, setRecipientId] = useState("");
  const [templateId, setTemplateId] = useState(KINDNESS_TEMPLATES[0]?.id ?? "");
  const [message, setMessage] = useState(KINDNESS_TEMPLATES[0]?.preview ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [seenReceivedIds, setSeenReceivedIds] = useState<string[]>([]);
  const [isRecipientPickerOpen, setIsRecipientPickerOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientResults, setRecipientResults] = useState<Day15Recipient[]>([]);
  const [recipientTotal, setRecipientTotal] = useState(0);
  const [recipientOffset, setRecipientOffset] = useState(0);
  const [hasMoreRecipients, setHasMoreRecipients] = useState(false);
  const [recipientRequestState, setRecipientRequestState] = useState<RequestState>("idle");

  const selectedTemplate = useMemo(
    () => KINDNESS_TEMPLATES.find((template) => template.id === templateId) ?? KINDNESS_TEMPLATES[0],
    [templateId]
  );
  const selectedRecipient = useMemo(
    () => state?.recipients.find((recipient) => recipient.id === recipientId) ?? null,
    [recipientId, state?.recipients]
  );
  const activeRecipient = selectedRecipient ??
    recipientResults.find((recipient) => recipient.id === recipientId) ??
    null;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECEIVED_SEEN_STORAGE_KEY);
      setSeenReceivedIds(stored ? (JSON.parse(stored) as string[]) : []);
    } catch {
      setSeenReceivedIds([]);
    }
  }, []);

  const loadState = async (showSpinner = false) => {
    if (showSpinner) {
      setRequestState("loading");
    }

    const response = await fetch("/api/day15", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      setState({
        isAuthenticated: false,
        sentCount: 0,
        remainingCount: 0,
        firstSendRewardGranted: false,
        recipients: [],
        sentCards: [],
        receivedCards: [],
        liveStats: {
          totalCardsSent: 0,
          activeSenders: 0
        }
      });
      setRequestState("idle");
      return;
    }

    const payload = (await response.json()) as Day15State;
    setState(payload);
    setRequestState("idle");
    setRecipientId((current) => current || payload.recipients[0]?.id || "");
  };

  const loadRecipients = async ({
    query,
    offset,
    append
  }: {
    query: string;
    offset: number;
    append: boolean;
  }) => {
    setRecipientRequestState("loading");

    const response = await fetch(
      `/api/day15/recipients?q=${encodeURIComponent(query)}&offset=${offset}&limit=${RECIPIENTS_PAGE_SIZE}`,
      { credentials: "same-origin" }
    );
    const payload = (await response.json().catch(() => null)) as
      | Day15RecipientsPage
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setRecipientRequestState("idle");
      return;
    }

    const page = payload as Day15RecipientsPage;

    setRecipientResults((current) =>
      append
        ? [
            ...current,
            ...page.items.filter(
              (item) => !current.some((existing) => existing.id === item.id)
            )
          ]
        : page.items
    );
    setRecipientTotal(page.total);
    setRecipientOffset(offset + page.items.length);
    setHasMoreRecipients(page.hasMore);
    setRecipientRequestState("idle");
  };

  useEffect(() => {
    void loadState(true);
  }, []);

  useEffect(() => {
    if (!state?.isAuthenticated) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadState(false);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [state?.isAuthenticated]);

  useEffect(() => {
    if (!isRecipientPickerOpen) {
      return;
    }

    void loadRecipients({
      query: recipientSearch,
      offset: 0,
      append: false
    });
  }, [isRecipientPickerOpen, recipientSearch]);

  if (!state) {
    return <LoadingCard text="Загружаем День доброты..." />;
  }

  if (!state.isAuthenticated) {
    return (
      <InfoCard
        title="Требуется авторизация"
        description="Откройте приложение внутри Telegram, чтобы отправлять цифровые открытки другим участникам."
      />
    );
  }

  const canSend =
    requestState === "idle" &&
    state.remainingCount > 0 &&
    Boolean(recipientId) &&
    Boolean(templateId) &&
    message.trim().length > 0;

  const handleTemplateChange = (nextTemplateId: string) => {
    setTemplateId(nextTemplateId);
    const nextTemplate = KINDNESS_TEMPLATES.find((template) => template.id === nextTemplateId);

    if (nextTemplate && !message.trim()) {
      setMessage(nextTemplate.preview);
    }
  };

  const handleSend = async () => {
    setRequestState("loading");
    setFeedback(null);

    const response = await fetch("/api/day15/send", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        recipientId,
        templateId,
        message: message.trim()
      })
    });
    const payload = (await response.json().catch(() => null)) as Day15State | { error?: string } | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Открытка не отправлена." : "Открытка не отправлена.");
      setRequestState("idle");
      return;
    }

    setState(payload as Day15State);
    setFeedback("Открытка отправлена.");
    setMessage("");
    setRequestState("idle");
  };

  const unseenReceivedCount = state.receivedCards.filter(
    (card) => !seenReceivedIds.includes(card.id)
  ).length;

  const markReceivedAsSeen = () => {
    const nextSeenIds = Array.from(
      new Set([...seenReceivedIds, ...state.receivedCards.map((card) => card.id)])
    );

    setSeenReceivedIds(nextSeenIds);
    window.localStorage.setItem(
      RECEIVED_SEEN_STORAGE_KEY,
      JSON.stringify(nextSeenIds)
    );
  };

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
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 20 }}>Отправьте цифровую открытку</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Выберите участника, оформите доброе сообщение и отправьте его прямо в приложении. За первую отправку начисляются очки.
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10
          }}
        >
          <MetricCard label="Отправлено" value={`${state.sentCount}/10`} />
          <MetricCard label="Осталось" value={String(state.remainingCount)} />
          <MetricCard label="Общий счетчик" value={String(state.liveStats.totalCardsSent)} />
        </div>
      </section>

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
        <div style={{ display: "grid", gap: 8 }}>
          <span>Кому отправить</span>
          <button
            type="button"
            onClick={() => setIsRecipientPickerOpen(true)}
            style={{
              ...fieldStyle,
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer"
            }}
          >
            <span>
              {activeRecipient
                ? `${activeRecipient.displayName}${activeRecipient.telegramUsername ? ` · @${activeRecipient.telegramUsername}` : ""}`
                : "Выберите участника"}
            </span>
            <span style={{ color: "var(--muted)" }}>Поиск</span>
          </button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <span>Шаблон открытки</span>
          <div style={{ display: "grid", gap: 10 }}>
            {KINDNESS_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateChange(template.id)}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  border: template.id === templateId ? "2px solid var(--accent-strong)" : "1px solid var(--line)",
                  background: template.background,
                  color: template.accent,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "grid",
                  gap: 6
                }}
              >
                <strong>{template.name}</strong>
                <span>{template.preview}</span>
              </button>
            ))}
          </div>
        </div>

        <label style={{ display: "grid", gap: 8 }}>
          <span>Текст открытки</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={280}
            rows={5}
            placeholder="Напишите теплое пожелание"
            style={{ ...fieldStyle, resize: "vertical", minHeight: 120 }}
          />
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{message.length}/280</span>
        </label>

        <div
          style={{
            borderRadius: 20,
            padding: 20,
            background: selectedTemplate?.background ?? "var(--surface)",
            color: selectedTemplate?.accent ?? "var(--text)",
            border: "1px solid rgba(79, 45, 24, 0.08)",
            display: "grid",
            gap: 14,
            overflow: "hidden",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -28,
              right: -18,
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.28)"
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -22,
              left: -8,
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.18)"
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              position: "relative",
              flexWrap: "wrap"
            }}
          >
            <strong style={{ fontSize: 18 }}>{selectedTemplate?.name ?? "Открытка"}</strong>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.54)",
                fontSize: 12,
                fontWeight: 700
              }}
            >
              {selectedRecipient ? `Для ${selectedRecipient.displayName}` : "Предпросмотр"}
            </span>
          </div>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {message.trim() || "Здесь появится предпросмотр вашей открытки."}
          </p>
          <span
            style={{
              fontSize: 13,
              color: "rgba(45, 28, 17, 0.72)",
              position: "relative"
            }}
          >
            Цифровой Наурыз · День доброты
          </span>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          style={buttonStyle(!canSend)}
        >
          {requestState === "loading" ? "Отправляем..." : "Отправить открытку"}
        </button>

        {feedback ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.7)",
              border: "1px solid var(--line)"
            }}
          >
            {feedback}
          </div>
        ) : null}
      </section>

      {isRecipientPickerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(45, 28, 17, 0.34)",
            display: "grid",
            alignItems: "end"
          }}
        >
          <div
            style={{
              background: "var(--surface-strong)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 18,
              display: "grid",
              gap: 14,
              maxHeight: "82vh",
              overflow: "auto"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <strong style={{ fontSize: 20 }}>Выберите участника</strong>
              <button
                type="button"
                onClick={() => setIsRecipientPickerOpen(false)}
                style={pickerGhostButtonStyle}
              >
                Закрыть
              </button>
            </div>

            <label style={{ display: "grid", gap: 8 }}>
              <span>Поиск по имени или username</span>
              <input
                value={recipientSearch}
                onChange={(event) => setRecipientSearch(event.target.value)}
                placeholder="Например, eugen или @eugen"
                style={fieldStyle}
              />
            </label>

            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              Найдено: {recipientTotal}
            </span>

            <div style={{ display: "grid", gap: 10 }}>
              {recipientResults.map((recipient) => (
                <button
                  key={recipient.id}
                  type="button"
                  onClick={() => {
                    setRecipientId(recipient.id);
                    setIsRecipientPickerOpen(false);
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px minmax(0, 1fr)",
                    gap: 12,
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 18,
                    border:
                      recipient.id === recipientId
                        ? "2px solid var(--accent-strong)"
                        : "1px solid var(--line)",
                    background: "rgba(255, 255, 255, 0.72)",
                    textAlign: "left",
                    cursor: "pointer"
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                      background: "var(--accent)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: 18
                    }}
                  >
                    {recipient.avatarUrl ? (
                      <img
                        src={recipient.avatarUrl}
                        alt={recipient.displayName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      recipient.displayName.slice(0, 1)
                    )}
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong>{recipient.displayName}</strong>
                    <span style={{ color: "var(--muted)" }}>
                      {recipient.telegramUsername ? `@${recipient.telegramUsername}` : "username не указан"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {!recipientResults.length && recipientRequestState === "idle" ? (
              <span style={{ color: "var(--muted)" }}>
                По вашему запросу никто не найден.
              </span>
            ) : null}

            {hasMoreRecipients ? (
              <button
                type="button"
                onClick={() =>
                  void loadRecipients({
                    query: recipientSearch,
                    offset: recipientOffset,
                    append: true
                  })
                }
                disabled={recipientRequestState === "loading"}
                style={pickerGhostButtonStyle}
              >
                {recipientRequestState === "loading" ? "Загружаем..." : "Загрузить еще"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <section style={{ display: "grid", gap: 14 }}>
        <InfoCard
          title="Отправленные открытки"
          description={
            state.sentCards.length
              ? "История ваших отправок за День доброты."
              : "Вы еще не отправляли открытки."
          }
        />
        {state.sentCards.map((card) => (
          <CardHistory
            key={card.id}
            title={`Для ${card.recipient.displayName}`}
            subtitle={card.recipient.telegramUsername ? `@${card.recipient.telegramUsername}` : ""}
            message={card.message}
            templateId={card.templateId}
            createdAt={card.createdAt}
          />
        ))}
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <section
          style={{
            padding: 18,
            borderRadius: 22,
            background: "var(--surface-strong)",
            border: "1px solid var(--line)",
            display: "grid",
            gap: 10
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            <strong style={{ fontSize: 20 }}>Полученные открытки</strong>
            {unseenReceivedCount > 0 ? (
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(191, 93, 43, 0.1)",
                  color: "var(--accent-strong)",
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                Новые: {unseenReceivedCount}
              </span>
            ) : null}
          </div>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            {state.receivedCards.length
              ? "Открытки, которые другие участники отправили вам."
              : "Пока никто не отправил вам открытку."}
          </span>
          {unseenReceivedCount > 0 ? (
            <button
              type="button"
              onClick={markReceivedAsSeen}
              style={{
                justifySelf: "start",
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid var(--line)",
                background: "rgba(255, 255, 255, 0.72)",
                color: "var(--text)",
                cursor: "pointer"
              }}
            >
              Отметить как просмотренные
            </button>
          ) : null}
        </section>
        {state.receivedCards.map((card) => (
          <CardHistory
            key={card.id}
            title={`От ${card.sender.displayName}`}
            subtitle={card.sender.telegramUsername ? `@${card.sender.telegramUsername}` : ""}
            message={card.message}
            templateId={card.templateId}
            createdAt={card.createdAt}
            isNew={!seenReceivedIds.includes(card.id)}
          />
        ))}
      </section>
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
      <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>{description}</span>
    </section>
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

function CardHistory({
  title,
  subtitle,
  message,
  templateId,
  createdAt,
  isNew = false
}: {
  title: string;
  subtitle: string;
  message: string;
  templateId: string;
  createdAt: string;
  isNew?: boolean;
}) {
  const template = KINDNESS_TEMPLATES.find((item) => item.id === templateId);

  return (
    <section
      style={{
        padding: 18,
        borderRadius: 22,
        background: template?.background ?? "var(--surface-strong)",
        border: "1px solid var(--line)",
        display: "grid",
        gap: 10,
        color: template?.accent ?? "var(--text)",
        overflow: "hidden",
        position: "relative"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -24,
          right: -14,
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.22)"
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            <strong>{title}</strong>
            {isNew ? (
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "rgba(255, 255, 255, 0.6)",
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                Новая
              </span>
            ) : null}
          </div>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <span style={{ color: "var(--muted)" }}>{formatTime(createdAt)}</span>
      </div>
      <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{message}</p>
      <span style={{ fontSize: 12, color: "rgba(45, 28, 17, 0.62)" }}>
        {template?.name ?? "Открытка"} · День доброты
      </span>
    </section>
  );
}

function formatTime(isoString: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoString));
}

const fieldStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "white",
  color: "var(--text)"
};

const pickerGhostButtonStyle = {
  justifySelf: "start",
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "rgba(255, 255, 255, 0.72)",
  color: "var(--text)",
  cursor: "pointer"
};

function buttonStyle(disabled: boolean) {
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
import type { AppLocale } from "@/lib/locale";
