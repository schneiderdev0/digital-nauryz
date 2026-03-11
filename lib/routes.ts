import { notFound } from "next/navigation";

import { getEventDefinitions } from "@/lib/events";

export function getEventBySlug(slug: string) {
  const event = getEventDefinitions().find((item) => item.slug === slug);

  if (!event) {
    notFound();
  }

  return event;
}
