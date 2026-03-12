import { AppShell } from "@/components/app-shell";
import { Day14MeetingsExperience } from "@/components/day-14-meetings-experience";
import { Day15KindnessExperience } from "@/components/day-15-kindness-experience";
import { Day16CultureExperience } from "@/components/day-16-culture-experience";
import { Day17FamilyExperience } from "@/components/day-17-family-experience";
import { Day18OutfitExperience } from "@/components/day-18-outfit-experience";
import { Day19RenewalExperience } from "@/components/day-19-renewal-experience";
import { Day20SportsExperience } from "@/components/day-20-sports-experience";
import { EventDetail } from "@/components/event-detail";
import { FloatingBackButton } from "@/components/floating-back-button";
import { getEventDefinitions } from "@/lib/events";
import { getRequestLocale } from "@/lib/locale";
import { getEventBySlug } from "@/lib/routes";

export function generateStaticParams() {
  return getEventDefinitions("ru").map((event) => ({ slug: event.slug }));
}

export default async function EventPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const locale = await getRequestLocale();
  const { slug } = await params;
  const event = getEventBySlug(slug, locale);

  return (
    <AppShell
      locale={locale}
      eyebrow={event.dateLabel}
      title={event.title}
      description={event.subtitle}
    >
      <FloatingBackButton locale={locale} />
      {event.slug === "day-14-meetings" ? (
        <Day14MeetingsExperience locale={locale} />
      ) : event.slug === "day-15-kindness" ? (
        <Day15KindnessExperience locale={locale} />
      ) : event.slug === "day-16-culture" ? (
        <Day16CultureExperience locale={locale} />
      ) : event.slug === "day-17-family" ? (
        <Day17FamilyExperience locale={locale} />
      ) : event.slug === "day-18-outfit" ? (
        <Day18OutfitExperience locale={locale} />
      ) : event.slug === "day-19-renewal" ? (
        <Day19RenewalExperience locale={locale} />
      ) : event.slug === "day-20-sports" ? (
        <Day20SportsExperience locale={locale} />
      ) : (
        <EventDetail locale={locale} event={event} />
      )}
    </AppShell>
  );
}
