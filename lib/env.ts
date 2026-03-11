type PublicEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_TELEGRAM_BOT_NAME"
  | "NEXT_PUBLIC_TELEGRAM_DEBUG";
type ServerEnvKey =
  | "SUPABASE_INTERNAL_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "TELEGRAM_BOT_TOKEN"
  | "TELEGRAM_AUTH_SECRET";
type EnvKey = PublicEnvKey | ServerEnvKey;

function getOptionalEnv(key: EnvKey) {
  const value = process.env[key];
  return value && value.length > 0 ? value : null;
}

function getRequiredEnv(key: EnvKey) {
  const value = getOptionalEnv(key);

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const env = {
  supabaseUrl: getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseInternalUrl: getOptionalEnv("SUPABASE_INTERNAL_URL"),
  telegramBotName: getOptionalEnv("NEXT_PUBLIC_TELEGRAM_BOT_NAME"),
  telegramDebug: getOptionalEnv("NEXT_PUBLIC_TELEGRAM_DEBUG") === "true",
  serviceRoleKey: getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  telegramBotToken: getOptionalEnv("TELEGRAM_BOT_TOKEN"),
  telegramAuthSecret: getOptionalEnv("TELEGRAM_AUTH_SECRET"),
  hasSupabase: Boolean(
    getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  ),
  requireSupabase() {
    return {
      url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    };
  },
  requireInternalSupabaseUrl() {
    return getRequiredEnv("SUPABASE_INTERNAL_URL");
  },
  requireServiceRoleKey() {
    return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  requireTelegramBotToken() {
    return getRequiredEnv("TELEGRAM_BOT_TOKEN");
  },
  getTelegramAuthSecret() {
    return getOptionalEnv("TELEGRAM_AUTH_SECRET") ?? getRequiredEnv("TELEGRAM_BOT_TOKEN");
  }
};
