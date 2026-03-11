export const DAY17_EVENT_DAY = 17;
export const DAY17_MAX_MEMBERS = 6;
export const DAY17_REWARD_POINTS = 40;

export type Day17GroupMember = {
  id: string;
  displayName: string;
  telegramUsername: string | null;
  avatarUrl: string | null;
  joinedAt: string;
};

export type Day17Group = {
  id: string;
  inviteCode: string;
  status: "forming" | "completed";
  createdAt: string;
  completedAt: string | null;
  ownerId: string;
  isOwner: boolean;
  memberCount: number;
  remainingSlots: number;
  members: Day17GroupMember[];
};

export type Day17State =
  | {
      isAuthenticated: false;
      maxMembers: number;
      rewardPoints: number;
      group: null;
    }
  | {
      isAuthenticated: true;
      maxMembers: number;
      rewardPoints: number;
      group: Day17Group | null;
    };
