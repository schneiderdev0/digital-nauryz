export const DAY19_EVENT_DAY = 19;
export const DAY19_REWARD_POINTS = 25;
export const DAY19_TREES = [
  {
    id: "spring",
    name: "Весеннее",
    description: "Светлая крона и мягкие зеленые оттенки."
  },
  {
    id: "sunrise",
    name: "Рассвет",
    description: "Теплая палитра с золотистыми листьями."
  },
  {
    id: "night",
    name: "Ночной сад",
    description: "Глубокие синие тона и яркие акценты."
  }
] as const;

export type Day19TreeId = (typeof DAY19_TREES)[number]["id"];

export type Day19State =
  | {
      isAuthenticated: false;
      rewardPoints: number;
      hasCreatedCard: false;
      displayName: null;
      goal: "";
      treeId: Day19TreeId;
      completedAt: null;
    }
  | {
      isAuthenticated: true;
      rewardPoints: number;
      hasCreatedCard: boolean;
      displayName: string;
      goal: string;
      treeId: Day19TreeId;
      completedAt: string | null;
    };
