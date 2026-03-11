import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import type { TelegramUser } from "@/lib/telegram";

const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24;

export class TelegramAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramAuthError";
  }
}

export type VerifiedTelegramInitData = {
  authDate: number;
  queryId: string | null;
  startParam: string | null;
  user: TelegramUser;
};

export function verifyTelegramInitData(initData: string): VerifiedTelegramInitData {
  if (!initData) {
    throw new TelegramAuthError("Missing Telegram init data.");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new TelegramAuthError("Telegram hash is missing.");
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) {
    throw new TelegramAuthError("Telegram auth date is invalid.");
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (nowInSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
    throw new TelegramAuthError("Telegram init data is expired.");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new TelegramAuthError("Telegram user payload is missing.");
  }

  let user: TelegramUser;

  try {
    user = JSON.parse(userRaw) as TelegramUser;
  } catch {
    throw new TelegramAuthError("Telegram user payload is malformed.");
  }

  if (!user?.id || !user.first_name) {
    throw new TelegramAuthError("Telegram user payload is incomplete.");
  }

  const entries = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right));
  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(env.requireTelegramBotToken())
    .digest();
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const calculatedBuffer = Buffer.from(calculatedHash, "hex");

  if (
    hashBuffer.length !== calculatedBuffer.length ||
    !timingSafeEqual(hashBuffer, calculatedBuffer)
  ) {
    throw new TelegramAuthError("Telegram init data signature is invalid.");
  }

  return {
    authDate,
    queryId: params.get("query_id"),
    startParam: params.get("start_param"),
    user
  };
}

export function getTelegramAuthEmail(userId: number) {
  return `tg_${userId}@telegram.local`;
}

export function getTelegramAuthPassword(userId: number) {
  return createHmac("sha256", env.getTelegramAuthSecret())
    .update(`telegram-auth:${userId}`)
    .digest("hex");
}

export function getTelegramDisplayName(
  user: Pick<TelegramUser, "id" | "first_name" | "last_name" | "username">
) {
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

  if (displayName) {
    return displayName;
  }

  if (user.username) {
    return user.username;
  }

  return `Telegram user ${user.id}`;
}
