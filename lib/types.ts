export type EventStatus = "upcoming" | "active" | "completed";

export type EventSlug =
  | "day-14-meetings"
  | "day-15-kindness"
  | "day-16-culture"
  | "day-17-family"
  | "day-18-outfit"
  | "day-19-renewal"
  | "day-20-sports";

export type EventDefinition = {
  day: number;
  dateLabel: string;
  slug: EventSlug;
  title: string;
  subtitle: string;
  description: string;
  pointsLabel: string;
  status: EventStatus;
  tags: string[];
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  score: number;
  streak: number;
};

export type UserProfile = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  score: number;
  city?: string;
  telegramUsername?: string;
};
