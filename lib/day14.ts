export type Day14ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string | null;
  text: string;
  createdAt: string;
  isMine: boolean;
};

export type Day14MeetingState = {
  isAuthenticated: boolean;
  isSearching: boolean;
  reassignmentsUsed: number;
  pair: {
    id: string;
    pairCode: string;
    myConfirmationCode: string;
    myQrPayload: string;
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
    messages: Day14ChatMessage[];
  } | null;
};
