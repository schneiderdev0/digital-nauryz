import { notFound } from "next/navigation";

import { getEventDefinitions } from "@/lib/events";
import type { AppLocale } from "@/lib/locale";

export function getEventBySlug(slug: string, locale: AppLocale = "ru") {
  const event = getEventDefinitions(locale).find((item) => item.slug === slug);

  if (!event) {
    notFound();
  }

  return event;
}
