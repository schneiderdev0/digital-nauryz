import { LeaderboardEntry, UserProfile } from "@/lib/types";

export const demoProfile: UserProfile = {
  id: "demo-user",
  name: "Aruzhan",
  telegramUsername: "aruzhan_demo",
  city: "Алматы",
  score: 140
};

export const demoLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Aruzhan", score: 140, streak: 4 },
  { rank: 2, name: "Dias", score: 130, streak: 4 },
  { rank: 3, name: "Amina", score: 120, streak: 3 },
  { rank: 4, name: "Nursultan", score: 112, streak: 3 },
  { rank: 5, name: "Kamila", score: 105, streak: 2 }
];
