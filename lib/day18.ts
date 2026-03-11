export const DAY18_EVENT_DAY = 18;
export const DAY18_REWARD_POINTS = 30;
export const DAY18_OUTFITS = [
  {
    id: "saukele",
    name: "Саукеле",
    description: "Высокий свадебный головной убор с золотыми акцентами."
  },
  {
    id: "tyubeteika",
    name: "Тюбетейка",
    description: "Легкая национальная шапочка с орнаментом."
  },
  {
    id: "chapan",
    name: "Чапан",
    description: "Праздничный образ с широким воротом и вышивкой."
  }
] as const;

export type Day18OutfitId = (typeof DAY18_OUTFITS)[number]["id"];

export type Day18OverlayTransform = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
};

export type Day18State =
  | {
      isAuthenticated: false;
      rewardPoints: number;
      hasCapturedFirstPhoto: false;
      captureCount: 0;
      lastOutfitId: null;
      completedAt: null;
    }
  | {
      isAuthenticated: true;
      rewardPoints: number;
      hasCapturedFirstPhoto: boolean;
      captureCount: number;
      lastOutfitId: Day18OutfitId | null;
      completedAt: string | null;
    };
