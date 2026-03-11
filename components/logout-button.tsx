"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST"
      });
    } finally {
      setIsPending(false);
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      style={{
        padding: "10px 14px",
        borderRadius: 14,
        border: "1px solid var(--line)",
        background: "rgba(255, 255, 255, 0.72)",
        color: "var(--text)",
        cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.65 : 1
      }}
    >
      {isPending ? "Выходим..." : "Выйти"}
    </button>
  );
}
