export type Day14MeetingState = {
  isAuthenticated: boolean;
  isSearching: boolean;
  reassignmentsUsed: number;
  pair: {
    id: string;
    pairCode: string;
    myConfirmationCode: string;
    status: "pending" | "matched" | "confirmed" | "expired" | "reassigned";
    assignedAt: string;
    completedAt: string | null;
    partner: {
      id: string;
      displayName: string;
      telegramUsername: string | null;
      avatarUrl: string | null;
    };
    confirmations: {
      total: number;
      isConfirmedByMe: boolean;
    };
  } | null;
};
