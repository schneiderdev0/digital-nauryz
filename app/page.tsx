import { AppShell } from "@/components/app-shell";
import { AuthStatusCard } from "@/components/auth-status-card";
import { AuthStatusCardClient } from "@/components/auth-status-card-client";
import { EventGrid } from "@/components/event-grid";
import { LeaderboardPreview } from "@/components/leaderboard-preview";
import { NextEventCountdown } from "@/components/next-event-countdown";
import { getAuthState } from "@/lib/auth/server";
import { getEventDefinitions } from "@/lib/events";

export default async function HomePage() {
  const events = getEventDefinitions();
  const authState = await getAuthState();

  return (
    <AppShell
      eyebrow=""
      title="Цифровой Наурыз"
      titleAddon={<NextEventCountdown />}
      description=""
    >
      <AuthStatusCardClient profile={authState.profile} score={authState.score} />
      <EventGrid events={events} />
      <LeaderboardPreview />
    </AppShell>
  );
}
