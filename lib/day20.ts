export const DAY20_EVENT_DAY = 20;
export const DAY20_PVP_REWARD_POINTS = 60;
export const DAY20_SOLO_DURATION_SECONDS = 10;
export const DAY20_PVP_DURATION_SECONDS = 10;
export const DAY20_LEADERBOARD_LIMIT = 10;

export type Day20RoomStatus = "waiting" | "racing" | "finished";

export type Day20RoomMember = {
  userId: string;
  displayName: string;
  telegramUsername: string | null;
  avatarUrl: string | null;
  tapCount: number;
  joinedAt: string;
  isMe: boolean;
};

export type Day20RaceRoom = {
  id: string;
  inviteCode: string;
  status: Day20RoomStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  endsAt: string | null;
  durationSeconds: number;
  winnerId: string | null;
  isOwner: boolean;
  myTapCount: number;
  opponentTapCount: number;
  members: Day20RoomMember[];
};

export type Day20LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  telegramUsername: string | null;
  score: number;
  soloBestTaps: number;
  pvpWins: number;
};

export type Day20State = {
  isAuthenticated: boolean;
  rewardPoints: number;
  soloDurationSeconds: number;
  pvpDurationSeconds: number;
  soloBestTaps: number;
  soloLastTaps: number;
  room: Day20RaceRoom | null;
  leaderboard: Day20LeaderboardEntry[];
};
