import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import {
  getTelegramAuthEmail,
  getTelegramAuthPassword,
  getTelegramDisplayName,
  TelegramAuthError,
  verifyTelegramInitData
} from "@/lib/auth/telegram";
import { Database } from "@/lib/database.types";
import { env } from "@/lib/env";
import { fetchProfileByTelegramUserId } from "@/lib/supabase/queries";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function isUserAlreadyExistsError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("already") || message.includes("registered") || message.includes("exists");
}

function getErrorMessage(error: unknown) {
  if (error instanceof TelegramAuthError) {
    return error.message;
  }

  if (error instanceof Error) {
    const details = [
      "message" in error ? error.message : null,
      "code" in error && typeof error.code === "string" ? `code=${error.code}` : null,
      "status" in error && typeof error.status === "number" ? `status=${error.status}` : null
    ].filter(Boolean);

    return details.join(" | ") || "Telegram authentication failed.";
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return "Telegram authentication failed.";
    }
  }

  return "Telegram authentication failed.";
}

export async function POST(request: Request) {
  if (!env.hasSupabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  let initData = "";

  try {
    const body = (await request.json()) as { initData?: string };
    initData = body.initData ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const verified = verifyTelegramInitData(initData);
    const adminClient = getSupabaseAdminClient();
    const { user: telegramUser } = verified;
    const email = getTelegramAuthEmail(telegramUser.id);
    const password = getTelegramAuthPassword(telegramUser.id);
    const displayName = getTelegramDisplayName(telegramUser);

    const { data: existingProfile, error: existingProfileError } =
      await fetchProfileByTelegramUserId(adminClient, telegramUser.id);

    if (existingProfileError) {
      throw existingProfileError;
    }

    let authUserId = existingProfile?.id ?? null;

    if (!authUserId) {
      const createUserResult = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_user_id: telegramUser.id,
          telegram_username: telegramUser.username ?? null,
          display_name: displayName,
          avatar_url: telegramUser.photo_url ?? null
        }
      });

      if (createUserResult.error || !createUserResult.data.user) {
        if (isUserAlreadyExistsError(createUserResult.error)) {
          const { url } = env.requireSupabase();
          const recoveryClient = createClient<Database>(
            env.supabaseInternalUrl ?? url,
            env.requireSupabase().anonKey,
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false
              }
            }
          );
          const recoverySignInResult = await recoveryClient.auth.signInWithPassword({
            email,
            password
          });

          if (recoverySignInResult.error || !recoverySignInResult.data.user) {
            throw recoverySignInResult.error ?? createUserResult.error ?? new Error("Unable to recover auth user.");
          }

          authUserId = recoverySignInResult.data.user.id;
        } else {
          throw createUserResult.error ?? new Error("Unable to create auth user.");
        }
      } else {
        authUserId = createUserResult.data.user.id;
      }
    }

    const updatePasswordResult = await adminClient.auth.admin.updateUserById(authUserId, {
      password,
      user_metadata: {
        telegram_user_id: telegramUser.id,
        telegram_username: telegramUser.username ?? null,
        display_name: displayName,
        avatar_url: telegramUser.photo_url ?? null
      }
    });

    if (updatePasswordResult.error) {
      throw updatePasswordResult.error;
    }

    const upsertProfileResult = await adminClient.from("profiles").upsert(
      {
        id: authUserId,
        display_name: displayName,
        telegram_user_id: telegramUser.id,
        telegram_username: telegramUser.username ?? null,
        avatar_url: telegramUser.photo_url ?? null
      },
      {
        onConflict: "id"
      }
    );

    if (upsertProfileResult.error) {
      throw upsertProfileResult.error;
    }

    const cookieStore = await cookies();
    const config = env.requireSupabase();
    const response = NextResponse.json({
      ok: true,
      user: {
        id: authUserId,
        displayName,
        telegramUsername: telegramUser.username ?? null
      }
    });
    const internalUrl = env.supabaseInternalUrl ?? config.url;
    const supabase = createServerClient<Database>(internalUrl, config.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookieList) {
          cookieList.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    });

    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInResult.error) {
      throw signInResult.error;
    }

    return response;
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("Telegram auth route failed:", error);

    return NextResponse.json(
      { error: message },
      { status: error instanceof TelegramAuthError ? 401 : 500 }
    );
  }
}
