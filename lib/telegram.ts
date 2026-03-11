export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

export type TelegramInitDataUnsafe = {
  user?: TelegramUser;
  start_param?: string;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: TelegramInitDataUnsafe;
  ready?: () => void;
  expand?: () => void;
};

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as Window & {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }).Telegram?.WebApp ?? null;
}

export function getTelegramInitData(): TelegramInitDataUnsafe | null {
  return getTelegramWebApp()?.initDataUnsafe ?? null;
}

export function getTelegramInitDataRaw() {
  return getTelegramWebApp()?.initData ?? "";
}

export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();

  webApp?.ready?.();
  webApp?.expand?.();
}

export function getTelegramUserName() {
  const user = getTelegramInitData()?.user;

  if (!user) {
    return null;
  }

  return [user.first_name, user.last_name].filter(Boolean).join(" ");
}
