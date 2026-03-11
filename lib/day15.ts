export type KindnessTemplate = {
  id: string;
  name: string;
  accent: string;
  background: string;
  preview: string;
};

export type Day15Recipient = {
  id: string;
  displayName: string;
  telegramUsername: string | null;
  avatarUrl: string | null;
};

export const KINDNESS_TEMPLATES: KindnessTemplate[] = [
  {
    id: "sun",
    name: "Теплый луч",
    accent: "#a3471f",
    background: "linear-gradient(135deg, #fff0c9 0%, #ffe2a5 100%)",
    preview: "Пусть этот день принесет тебе тепло и добрые встречи."
  },
  {
    id: "spring",
    name: "Весенний день",
    accent: "#2f7a52",
    background: "linear-gradient(135deg, #e4f5de 0%, #cdecc4 100%)",
    preview: "Пусть Наурыз наполнит день светом, обновлением и радостью."
  },
  {
    id: "night",
    name: "Звездный вечер",
    accent: "#5f4b8b",
    background: "linear-gradient(135deg, #ece7fb 0%, #d8cdf7 100%)",
    preview: "Пусть рядом будут люди, с которыми хочется делиться добром."
  }
];

export type Day15State = {
  isAuthenticated: boolean;
  sentCount: number;
  remainingCount: number;
  firstSendRewardGranted: boolean;
  recipients: Day15Recipient[];
  sentCards: {
    id: string;
    message: string;
    templateId: string;
    createdAt: string;
    recipient: {
      id: string;
      displayName: string;
      telegramUsername: string | null;
    };
  }[];
  receivedCards: {
    id: string;
    message: string;
    templateId: string;
    createdAt: string;
    sender: {
      id: string;
      displayName: string;
      telegramUsername: string | null;
    };
  }[];
  liveStats: {
    totalCardsSent: number;
    activeSenders: number;
  };
};

export type Day15RecipientsPage = {
  items: Day15Recipient[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
  query: string;
};
