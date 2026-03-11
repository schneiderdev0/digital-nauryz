"use client";

import { useEffect, useMemo, useState } from "react";

import { LoadingRing } from "@/components/loading-ring";
import {
  type Day18State,
  type Day18SubmitResult
} from "@/lib/day18";

type RequestState = "idle" | "loading" | "submitting";

export function Day18OutfitExperience() {
  const [state, setState] = useState<Day18State | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("loading");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<Day18SubmitResult | null>(null);

  useEffect(() => {
    const loadState = async () => {
      setRequestState("loading");

      const response = await fetch("/api/day18", {
        credentials: "same-origin"
      });
      const payload = (await response.json().catch(() => null)) as
        | Day18State
        | { error?: string }
        | null;

      if (!response.ok || !payload || "error" in payload) {
        setRequestState("idle");
        return;
      }

      setState(payload as Day18State);
      setRequestState("idle");
    };

    void loadState();
  }, []);

  const questions = state?.questions ?? [];
  const currentQuestion = questions[currentIndex] ?? null;
  const questionLookup = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions]
  );
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const canSubmit =
    state?.isAuthenticated &&
    questions.length > 0 &&
    answeredCount === questions.length &&
    requestState === "idle";

  const submitQuiz = async () => {
    if (!canSubmit || !state?.isAuthenticated) {
      return;
    }

    setRequestState("submitting");
    setFeedback(null);

    const response = await fetch("/api/day18/capture", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        answers: questions.map((question) => ({
          questionId: question.id,
          selectedIndex: selectedAnswers[question.id] ?? -1
        }))
      })
    });
    const payload = (await response.json().catch(() => null)) as
      | Day18SubmitResult
      | { error?: string }
      | null;

    if (!response.ok || !payload || "error" in payload) {
      setFeedback(
        payload && "error" in payload
          ? payload.error ?? "Не удалось завершить квиз."
          : "Не удалось завершить квиз."
      );
      setRequestState("idle");
      return;
    }

    const nextResult = payload as Day18SubmitResult;
    setResult(nextResult);
    setState(nextResult.state);
    setFeedback(
      `Вы набрали ${nextResult.score} из ${nextResult.totalQuestions}.`
    );
    setRequestState("idle");
  };

  const restartQuiz = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setFeedback(null);
  };

  if (!state) {
    return <LoadingCard text="Загружаем День национальной одежды..." />;
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 20 }}>Угадай элемент одежды</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Определите по иллюстрации, как называется элемент национального образа.
            За первое завершение квиза начисляется {state.rewardPoints} очков.
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
            gap: 10
          }}
        >
          <MetricCard label="Вопросов" value={String(state.questionCount)} />
          <MetricCard label="Лучший счет" value={String(state.bestScore)} />
          <MetricCard label="Последний счет" value={String(state.lastScore)} />
        </div>
      </section>

      {!state.isAuthenticated ? (
        <InfoCard
          title="Требуется авторизация"
          description="Откройте приложение внутри Telegram, чтобы пройти квиз и сохранить свой результат."
        />
      ) : null}

      {!result && currentQuestion ? (
        <section style={cardStyle}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <strong>
                Вопрос {currentIndex + 1} из {questions.length}
              </strong>
              <span style={{ color: "var(--muted)" }}>{progressPercent}%</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: "rgba(57, 34, 16, 0.08)",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: "var(--accent-strong)"
                }}
              />
            </div>
          </div>

          <div style={illustrationCardStyle}>
            <img
              src={currentQuestion.imageUrl}
              alt={currentQuestion.prompt}
              style={{
                width: "100%",
                display: "block",
                borderRadius: 18,
                border: "1px solid var(--line)",
                background: "white"
              }}
            />
            <strong style={{ fontSize: 20, lineHeight: 1.25 }}>
              {currentQuestion.prompt}
            </strong>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {currentQuestion.options.map((option, optionIndex) => {
              const active = selectedAnswers[currentQuestion.id] === optionIndex;

              return (
                <button
                  key={`${currentQuestion.id}-${option}`}
                  type="button"
                  onClick={() =>
                    setSelectedAnswers((current) => ({
                      ...current,
                      [currentQuestion.id]: optionIndex
                    }))
                  }
                  style={{
                    padding: 16,
                    borderRadius: 18,
                    border: active
                      ? "2px solid var(--accent-strong)"
                      : "1px solid var(--line)",
                    background: active ? "rgba(179, 73, 16, 0.08)" : "white",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "inherit",
                    lineHeight: 1.4
                  }}
                >
                  {option}
                </button>
              );
            })}
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
              onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
              disabled={currentIndex === 0}
              style={buttonStyle("secondary", currentIndex === 0)}
            >
              Назад
            </button>
            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))
                }
                style={buttonStyle("primary")}
              >
                Следующий вопрос
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void submitQuiz()}
                disabled={!canSubmit}
                style={buttonStyle("primary", !canSubmit)}
              >
                Завершить квиз
              </button>
            )}
          </div>
        </section>
      ) : null}

      {result ? (
        <section style={cardStyle}>
          <div style={{ display: "grid", gap: 6, textAlign: "center" }}>
            <strong style={{ fontSize: 28 }}>
              {result.score} / {result.totalQuestions}
            </strong>
            <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
              Посмотрите правильные ответы и попробуйте снова улучшить результат.
            </span>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {result.answers.map((answer) => {
              const question = questionLookup.get(answer.questionId);
              if (!question) {
                return null;
              }

              return (
                <div
                  key={answer.questionId}
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid var(--line)",
                    background: answer.isCorrect
                      ? "rgba(57, 122, 73, 0.08)"
                      : "rgba(179, 73, 16, 0.08)",
                    display: "grid",
                    gap: 6
                  }}
                >
                  <strong>{question.prompt}</strong>
                  <span style={{ color: "var(--muted)" }}>
                    Ваш ответ:{" "}
                    {answer.selectedIndex >= 0
                      ? question.options[answer.selectedIndex]
                      : "Нет ответа"}
                  </span>
                  {!answer.isCorrect ? (
                    <span>Правильно: {question.options[answer.correctIndex]}</span>
                  ) : (
                    <span>Верно</span>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" onClick={() => restartQuiz()} style={buttonStyle("primary")}>
            Пройти еще раз
          </button>
        </section>
      ) : null}

      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <h3 style={{ margin: 0 }}>Лучшие результаты дня</h3>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
            Топ участников по лучшему счету в квизе.
          </p>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {state.leaderboard.length ? (
            state.leaderboard.map((entry, index) => (
              <div key={`${entry.displayName}-${index}`} style={leaderboardRowStyle}>
                <strong>#{index + 1}</strong>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", overflowWrap: "anywhere" }}>
                    {entry.displayName}
                  </strong>
                  <span style={{ color: "var(--muted)" }}>
                    {entry.telegramUsername
                      ? `@${entry.telegramUsername}`
                      : "Участник мероприятия"}
                  </span>
                </div>
                <strong>{entry.score}</strong>
              </div>
            ))
          ) : (
            <span style={{ color: "var(--muted)" }}>
              Пока нет завершенных результатов.
            </span>
          )}
        </div>
      </section>

      {feedback ? <div style={feedbackStyle}>{feedback}</div> : null}
    </section>
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
        Подключаем вопросы и результаты участников.
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
      <strong style={{ fontSize: 22, lineHeight: 1.1 }}>{value}</strong>
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

const cardStyle = {
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 24,
  background: "rgba(255,255,255,0.72)",
  border: "1px solid var(--line)"
} as const;

const illustrationCardStyle = {
  display: "grid",
  gap: 12
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
