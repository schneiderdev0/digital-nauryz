"use client";

import { useEffect, useState } from "react";

const EVENT_DAYS = [14, 15, 16, 17, 18, 19, 20];
const TIME_ZONE = "Asia/Almaty";

type CountdownState = {
  label: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getZonedDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second")
  };
}

function getTimeZoneOffsetMs(date: Date) {
  const zoned = getZonedDateParts(date);
  const utcTimestamp = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second
  );

  return utcTimestamp - date.getTime();
}

function getZonedMidnightTimestamp(year: number, month: number, day: number) {
  const approxUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = getTimeZoneOffsetMs(approxUtc);
  return Date.UTC(year, month - 1, day, 0, 0, 0) - offset;
}

function getNextEventCountdown(now: Date): CountdownState {
  const zonedNow = getZonedDateParts(now);
  const currentTimestamp = now.getTime();

  const candidates = EVENT_DAYS.map((day) => ({
    year: zonedNow.year,
    day,
    timestamp: getZonedMidnightTimestamp(zonedNow.year, 3, day)
  }));

  const upcoming = candidates.find(({ timestamp }) => timestamp > currentTimestamp);
  const target =
    upcoming ??
    ({
      year: zonedNow.year + 1,
      day: EVENT_DAYS[0],
      timestamp: getZonedMidnightTimestamp(zonedNow.year + 1, 3, EVENT_DAYS[0])
    } as const);

  const diff = Math.max(0, target.timestamp - currentTimestamp);

  return {
    label: `${target.day} марта`,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60)
  };
}

function formatUnit(value: number) {
  return String(value).padStart(2, "0");
}

export function NextEventCountdown() {
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(getNextEventCountdown(new Date()));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (!countdown) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        justifyItems: "center",
        marginTop: 6,
        padding: "14px 16px",
        borderRadius: 20,
        border: "1px solid var(--line)",
        background: "var(--surface-strong)"
      }}
    >
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
        До следующего дня Наурыза: <strong style={{ color: "var(--fg)" }}>{countdown.label}</strong>
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-heading), serif",
          fontSize: 28,
          lineHeight: 1,
          textAlign: "center"
        }}
      >
        {formatUnit(countdown.days)}:{formatUnit(countdown.hours)}:{formatUnit(countdown.minutes)}:
        {formatUnit(countdown.seconds)}
      </p>
    </div>
  );
}
