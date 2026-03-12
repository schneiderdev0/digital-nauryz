"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function NavPrefetch() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/leaderboard");
    router.prefetch("/profile");
  }, [router]);

  return null;
}
