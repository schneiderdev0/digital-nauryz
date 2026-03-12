"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Day16QuizState } from "@/lib/day16";
import { LoadingRing } from "@/components/loading-ring";

type RequestState = "idle" | "loading";

export function Day16CultureExperience({ locale: _locale = "ru" }: { locale?: AppLocale }) {
  const [state, setState] = useState<Day16QuizState | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const autoSubmitLockRef = useRef(false);
  const inProgressQuestionIndex =
    state?.status === "in_progress" ? state.currentQuestionIndex : null;
  const inProgressQuestionStartedAt =
    state?.status === "in_progress" ? state.questionStartedAt : null;

  const loadState = async (showSpinner = false) => {
    if (showSpinner) {
      setRequestState("loading");
    }

    const response = await fetch("/api/day16", {
      credentials: "same-origin"
    });
    const payload = (await response.json().catch(() => null)) as Day16QuizState | null;

    if (!response.ok || !payload) {
      setRequestState("idle");
      return;
    }

    setState(payload as Day16QuizState);
    setRequestState("idle");
  };

  useEffect(() => {
    void loadState(true);
  }, []);

  useEffect(() => {
    setSelectedOption(null);
    autoSubmitLockRef.current = false;

    if (!state || state.status !== "in_progress") {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const diffMs =
        new Date(state.questionStartedAt).getTime() +
        state.secondsPerQuestion * 1000 -
        Date.now();
      const nextSeconds = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsLeft(nextSeconds);

      if (nextSeconds === 0 && !autoSubmitLockRef.current && requestState === "idle") {
        autoSubmitLockRef.current = true;
        void submitAnswer(null, "Время вышло. Переходим к следующему вопросу.");
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);

    return () => window.clearInterval(intervalId);
  }, [state?.status, inProgressQuestionIndex, inProgressQuestionStartedAt, requestState]);

  const submitAction = async (url: string, successMessage?: string) => {
    setRequestState("loading");
    setFeedback(null);

    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin"
    });
    const payload = (await response.json().catch(() => null)) as
      | Day16QuizState
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Операция не выполнена." : "Операция не выполнена.");
      setRequestState("idle");
      return;
    }

    setState(payload as Day16QuizState);
    setSelectedOption(null);
    setFeedback(successMessage ?? null);
    setRequestState("idle");
  };

  const submitAnswer = async (
    nextSelectedOption: number | null,
    successMessage?: string
  ) => {
    setRequestState("loading");
    setFeedback(null);

    const response = await fetch("/api/day16/answer", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        selectedOption: nextSelectedOption
      })
    });
    const payload = (await response.json().catch(() => null)) as
      | Day16QuizState
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(payload && "error" in payload ? payload.error ?? "Ответ не засчитан." : "Ответ не засчитан.");
      setRequestState("idle");
      autoSubmitLockRef.current = false;
      return;
    }

    setState(payload as Day16QuizState);
    setSelectedOption(null);
    setFeedback(successMessage ?? null);
    setRequestState("idle");
  };

  const progressValue = useMemo(() => {
    if (!state || state.totalQuestions === 0 || state.status === "locked") {
      return 0;
    }

    return Math.round((state.answeredCount / state.totalQuestions) * 100);
  }, [state]);

  if (!state) {
    return <LoadingCard text="Загружаем День культуры..." />;
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 20 }}>{state.quizTitle}</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Ответьте на вопросы о культуре и традициях Казахстана. На каждый вопрос дается {state.secondsPerQuestion} секунд.
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10
          }}
        >
          <MetricCard
            label="Прогресс"
            value={
              state.status === "locked"
                ? "0%"
                : `${state.answeredCount}/${state.totalQuestions}`
            }
          />
          <MetricCard
            label="Лучший счет"
            value={state.isAuthenticated ? String(state.bestScore) : "0"}
          />
          <MetricCard
            label="Максимум"
            value={String(state.totalQuestions * 10)}
          />
        </div>

        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "rgba(79, 45, 24, 0.08)",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${progressValue}%`,
              height: "100%",
              background: "var(--accent-strong)",
              transition: "width 180ms ease"
            }}
          />
        </div>
      </section>

      {!state.isAuthenticated ? (
        <InfoCard
          title="Требуется авторизация"
          description="Откройте приложение внутри Telegram, чтобы проходить квиз, сохранять прогресс и попадать в топ-10."
        />
      ) : state.status === "not_started" ? (
        <section style={cardStyle}>
          <div style={{ display: "grid", gap: 6 }}>
            <h3 style={{ margin: 0 }}>Квиз готов к старту</h3>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
              Вас ждет {state.totalQuestions} вопросов. За каждый правильный ответ начисляется 10 очков, а в общий рейтинг идет лучший результат.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void submitAction("/api/day16/start")}
            disabled={requestState === "loading"}
            style={buttonStyle("primary", requestState === "loading")}
          >
            {requestState === "loading" ? "Запускаем..." : "Начать квиз"}
          </button>
        </section>
      ) : null}

      {state.isAuthenticated && state.status === "in_progress" ? (
        <section style={cardStyle}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <strong>
                Вопрос {state.currentQuestionIndex + 1} из {state.totalQuestions}
              </strong>
              <StatusBadge
                label={`Осталось ${secondsLeft ?? state.secondsPerQuestion} сек.`}
                tone={secondsLeft !== null && secondsLeft <= 5 ? "danger" : "accent"}
              />
            </div>

            <h3 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>
              {state.currentQuestion.question}
            </h3>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {state.currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index;

              return (
                <button
                  key={`${state.currentQuestion.id}-${index}`}
                  type="button"
                  onClick={() => setSelectedOption(index)}
                  disabled={requestState === "loading"}
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    border: isSelected ? "2px solid var(--accent-strong)" : "1px solid var(--line)",
                    background: isSelected ? "rgba(179, 73, 16, 0.08)" : "white",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 18,
                    color: "var(--text)"
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              void submitAnswer(
                selectedOption,
                selectedOption === null
                  ? "Вопрос пропущен."
                  : "Ответ сохранен."
              )
            }
            disabled={requestState === "loading"}
            style={buttonStyle("primary", requestState === "loading")}
          >
            {requestState === "loading"
              ? "Проверяем..."
              : selectedOption === null
                ? "Пропустить вопрос"
                : "Ответить"}
          </button>

          {state.latestAnswer ? <AnswerFeedbackCard state={state} /> : null}
        </section>
      ) : null}

      {state.isAuthenticated && state.status === "completed" ? (
        <section style={cardStyle}>
          <div style={{ display: "grid", gap: 8 }}>
            <StatusBadge label="Квиз завершен" tone="success" />
            <h3 style={{ margin: 0, fontSize: 28 }}>Ваш результат: {state.score} очков</h3>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
              Правильных ответов: {state.correctAnswersCount} из {state.totalQuestions}. В общий счет идет ваш лучший результат: {state.bestScore} очков.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 10
            }}
          >
            <button
              type="button"
              onClick={() => void submitAction("/api/day16/restart")}
              disabled={requestState === "loading"}
              style={buttonStyle("primary", requestState === "loading")}
            >
              Пройти заново
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {state.results.map((result, index) => (
              <div
                key={`${result.questionId}-${index}`}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  border: "1px solid var(--line)",
                  background: "rgba(255, 255, 255, 0.72)",
                  display: "grid",
                  gap: 6
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong style={{ flex: 1 }}>{result.question}</strong>
                  <StatusBadge
                    label={result.isCorrect ? "Верно" : result.timedOut ? "Время вышло" : "Ошибка"}
                    tone={result.isCorrect ? "success" : "danger"}
                  />
                </div>
                <span style={{ color: "var(--muted)" }}>
                  Ваш ответ: {result.selectedLabel ?? "нет ответа"}
                </span>
                {!result.isCorrect ? (
                  <span style={{ color: "var(--muted)" }}>
                    Правильный ответ: {result.correctLabel}
                  </span>
                ) : null}
                <span>{result.explanation}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <h3 style={{ margin: 0 }}>Топ-10 по Дню культуры</h3>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
            Здесь отображаются лучшие результаты участников именно за 16 марта.
          </p>
        </div>

        {state.leaderboard.length === 0 ? (
          <span style={{ color: "var(--muted)" }}>Пока никто не завершил квиз.</span>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {state.leaderboard.map((entry) => (
              <div
                key={entry.userId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 18,
                  background: "rgba(255, 255, 255, 0.72)",
                  border: "1px solid var(--line)"
                }}
              >
                <strong>#{entry.rank}</strong>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{entry.displayName}</div>
                  <div style={{ color: "var(--muted)", fontSize: 14 }}>
                    {entry.telegramUsername ? `@${entry.telegramUsername}` : "участник"}
                  </div>
                </div>
                <strong>{entry.score}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

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

function AnswerFeedbackCard({ state }: { state: Extract<Day16QuizState, { status: "in_progress" }> }) {
  if (!state.latestAnswer) {
    return null;
  }

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        border: "1px solid var(--line)",
        background: "rgba(255, 255, 255, 0.72)",
        display: "grid",
        gap: 6
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <strong>{state.latestAnswer.isCorrect ? "Последний ответ верный" : "Последний ответ неверный"}</strong>
        <StatusBadge
          label={state.latestAnswer.isCorrect ? "+10 очков" : state.latestAnswer.timedOut ? "0 очков" : "0 очков"}
          tone={state.latestAnswer.isCorrect ? "success" : "danger"}
        />
      </div>
      <span style={{ color: "var(--muted)" }}>
        {state.latestAnswer.timedOut
          ? "Время на вопрос закончилось."
          : `Ваш ответ: ${state.latestAnswer.selectedLabel ?? "нет ответа"}`}
      </span>
      {!state.latestAnswer.isCorrect ? (
        <span style={{ color: "var(--muted)" }}>
          Правильный ответ: {state.latestAnswer.correctLabel}
        </span>
      ) : null}
      <span>{state.latestAnswer.explanation}</span>
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

function StatusBadge({
  label,
  tone
}: {
  label: string;
  tone: "accent" | "success" | "danger";
}) {
  const styles =
    tone === "success"
      ? {
          background: "rgba(64, 140, 96, 0.12)",
          color: "var(--success)"
        }
      : tone === "danger"
        ? {
            background: "rgba(180, 72, 56, 0.12)",
            color: "#b44838"
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

const cardStyle = {
  padding: 18,
  borderRadius: 22,
  background: "var(--surface-strong)",
  border: "1px solid var(--line)",
  display: "grid",
  gap: 14
} as const;
import type { AppLocale } from "@/lib/locale";
