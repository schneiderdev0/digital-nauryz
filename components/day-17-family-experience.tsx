"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { Day17State } from "@/lib/day17";
import { getTelegramInitData } from "@/lib/telegram";
import { LoadingRing } from "@/components/loading-ring";

type RequestState = "idle" | "loading";

export function Day17FamilyExperience() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<Day17State | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const autoJoinAttemptedRef = useRef(false);

  const inviteCodeFromUrl = searchParams.get("familyInvite")?.trim().toUpperCase() ?? "";
  const inviteCodeFromTelegram = useMemo(() => {
    const startParam = getTelegramInitData()?.start_param?.trim() ?? "";
    return startParam.startsWith("family_") ? startParam.slice("family_".length).toUpperCase() : "";
  }, []);
  const prefetchedInviteCode = inviteCodeFromUrl || inviteCodeFromTelegram;

  const loadState = async (showSpinner = false) => {
    if (showSpinner) {
      setRequestState("loading");
    }

    const response = await fetch("/api/day17", {
      credentials: "same-origin"
    });
    const payload = (await response.json().catch(() => null)) as Day17State | { error?: string } | null;

    if (!response.ok || !payload || "error" in payload) {
      setRequestState("idle");
      return;
    }

    setState(payload as Day17State);
    setRequestState("idle");
  };

  useEffect(() => {
    void loadState(true);
  }, []);

  useEffect(() => {
    if (prefetchedInviteCode && !inviteCodeInput) {
      setInviteCodeInput(prefetchedInviteCode);
    }
  }, [inviteCodeInput, prefetchedInviteCode]);

  useEffect(() => {
    if (!state?.isAuthenticated || state.group || !prefetchedInviteCode || autoJoinAttemptedRef.current) {
      return;
    }

    autoJoinAttemptedRef.current = true;
    void joinGroup(prefetchedInviteCode, "Вы присоединились к семейной группе.");
  }, [prefetchedInviteCode, state]);

  useEffect(() => {
    if (!state?.isAuthenticated || !state.group || state.group.status === "completed") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadState(false);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [state]);

  const joinGroup = async (inviteCode: string, successMessage?: string) => {
    setRequestState("loading");
    setFeedback(null);

    const response = await fetch("/api/day17/join", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ inviteCode })
    });
    const payload = (await response.json().catch(() => null)) as
      | Day17State
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Вступить в группу не удалось." : "Вступить в группу не удалось.");
      setRequestState("idle");
      return;
    }

    setState(payload as Day17State);
    setFeedback(successMessage ?? null);
    setRequestState("idle");
  };

  const submitAction = async (url: string, successMessage?: string) => {
    setRequestState("loading");
    setFeedback(null);

    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin"
    });
    const payload = (await response.json().catch(() => null)) as
      | Day17State
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Операция не выполнена." : "Операция не выполнена.");
      setRequestState("idle");
      return;
    }

    setState(payload as Day17State);
    setFeedback(successMessage ?? null);
    setRequestState("idle");
  };

  if (!state) {
    return <LoadingCard text="Загружаем День семьи..." />;
  }

  const shareLink =
    typeof window !== "undefined" && state.group
      ? `${window.location.origin}/events/day-17-family?familyInvite=${encodeURIComponent(state.group.inviteCode)}`
      : "";

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 20 }}>Соберите семейный шанырак</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Создайте группу или вступите по приглашению. Когда соберется {state.maxMembers} участников, семья завершится автоматически, а каждый получит {state.rewardPoints} очков.
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10
          }}
        >
          <MetricCard label="Размер семьи" value={String(state.maxMembers)} />
          <MetricCard label="Бонус" value={`+${state.rewardPoints}`} />
          <MetricCard label="Статус" value={state.group ? (state.group.status === "completed" ? "Готово" : "Сбор") : "Нет группы"} />
        </div>
      </section>

      {!state.isAuthenticated ? (
        <InfoCard
          title="Требуется авторизация"
          description="Откройте приложение внутри Telegram, чтобы создать семейную группу или вступить по приглашению."
        />
      ) : null}

      {state.isAuthenticated && !state.group ? (
        <>
          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Создать новую группу</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Создатель получает invite-код и делится им с остальными участниками семьи.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void submitAction("/api/day17/create", "Семейная группа создана.")}
              disabled={requestState === "loading"}
              style={buttonStyle("primary", requestState === "loading")}
            >
              {requestState === "loading" ? "Создаем..." : "Создать группу"}
            </button>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Вступить по коду</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                Введите код приглашения из ссылки или сообщения. Если группа еще не заполнена, вы сразу присоединитесь к семье.
              </p>
            </div>

            <input
              value={inviteCodeInput}
              onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
              placeholder="Например, A1B2C3"
              style={fieldStyle}
              maxLength={6}
            />

            <button
              type="button"
              onClick={() => void joinGroup(inviteCodeInput)}
              disabled={requestState === "loading" || inviteCodeInput.trim().length < 6}
              style={buttonStyle("secondary", requestState === "loading" || inviteCodeInput.trim().length < 6)}
            >
              {requestState === "loading" ? "Подключаем..." : "Вступить в группу"}
            </button>
          </section>
        </>
      ) : null}

      {state.isAuthenticated && state.group ? (
        <>
          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <StatusBadge
                label={state.group.status === "completed" ? "Шанырак собран" : "Идет набор семьи"}
                tone={state.group.status === "completed" ? "success" : "accent"}
              />
              <span style={{ color: "var(--muted)" }}>
                {state.group.memberCount}/{state.maxMembers} участников
              </span>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <strong style={{ fontSize: 20 }}>
                {state.group.status === "completed"
                  ? "Семья на 17 марта собрана"
                  : "Приглашайте остальных участников семьи"}
              </strong>
              <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                {state.group.status === "completed"
                  ? "Группа закрыта. Ниже доступна общая карточка шанырака с именами всех участников."
                  : `До завершения осталось ${state.group.remainingSlots} мест. Отправьте код или ссылку остальным участникам.`}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10
              }}
            >
              <MetricCard label="Код семьи" value={state.group.inviteCode} />
              <MetricCard label="Создатель" value={state.group.isOwner ? "Вы" : "Участник"} />
            </div>

            {state.group.status === "forming" ? (
              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => void copyText(state.group?.inviteCode ?? "", "Код приглашения скопирован.", setFeedback)}
                  style={buttonStyle("secondary")}
                >
                  Скопировать код
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(shareLink, "Ссылка-приглашение скопирована.", setFeedback)}
                  style={buttonStyle("secondary")}
                >
                  Скопировать ссылку
                </button>
              </div>
            ) : null}
          </section>

          <section style={cardStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0 }}>Участники семьи</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                В семейную группу входят шесть человек. Пустые слоты остаются открытыми до полного набора.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr)",
                gap: 10
              }}
            >
              {Array.from({ length: state.maxMembers }).map((_, index) => {
                const member = state.group?.members[index] ?? null;

                return (
                  <div
                    key={member?.id ?? `slot-${index}`}
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      border: "1px solid var(--line)",
                      background: "rgba(255, 255, 255, 0.72)",
                      display: "grid",
                      gap: 10
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", alignItems: "center", gap: 10 }}>
                      <AvatarCircle
                        name={member?.displayName ?? "?"}
                        avatarUrl={member?.avatarUrl ?? null}
                      />
                      <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                        <strong
                          style={{
                            display: "block",
                            overflowWrap: "anywhere",
                            lineHeight: 1.2
                          }}
                        >
                          {member?.displayName ?? `Свободное место ${index + 1}`}
                        </strong>
                        <span
                          style={{
                            color: "var(--muted)",
                            fontSize: 14,
                            overflowWrap: "anywhere"
                          }}
                        >
                          {member?.telegramUsername
                            ? `@${member.telegramUsername}`
                            : member
                              ? "участник"
                              : "ожидаем приглашение"}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: "var(--muted)", fontSize: 14 }}>
                      {member ? `Присоединился(ась) ${formatDate(member.joinedAt)}` : "Этот слот еще открыт"}
                    </span>
                  </div>
                );
              })}
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

function AvatarCircle({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        background: "var(--accent)",
        color: "white",
        fontWeight: 700,
        flexShrink: 0
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </div>
  );
}

async function copyText(value: string, successMessage: string, setFeedback: (value: string | null) => void) {
  try {
    await navigator.clipboard.writeText(value);
    setFeedback(successMessage);
  } catch {
    setFeedback("Скопировать не удалось.");
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
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

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <section style={cardStyle}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{description}</p>
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
      <strong style={{ fontSize: 24, lineHeight: 1.1 }}>{value}</strong>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "accent" | "success" }) {
  const styles =
    tone === "success"
      ? {
          background: "rgba(64, 140, 96, 0.12)",
          color: "var(--success)"
        }
      : {
          background: "rgba(179, 73, 16, 0.08)",
          color: "var(--accent-strong)"
        };

  return (
    <span
      style={{
        ...styles,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 14px",
        borderRadius: 999,
        fontWeight: 600,
        whiteSpace: "nowrap"
      }}
    >
      {label}
    </span>
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

const fieldStyle = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "white",
  padding: "14px 16px",
  color: "var(--text)",
  fontSize: 16
} as const;

const cardStyle = {
  padding: 18,
  borderRadius: 22,
  background: "var(--surface-strong)",
  border: "1px solid var(--line)",
  display: "grid",
  gap: 14
} as const;
