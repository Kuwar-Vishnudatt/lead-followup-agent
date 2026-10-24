export type Sender = "rep" | "buyer";

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  date: string; // ISO datetime
}

export type Tag = "Hot" | "Warm" | "Cold";

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  source: string;
  product: string;
  createdAt: string; // ISO datetime, when lead entered the system
  lastContactDate: string; // ISO datetime of most recent contact (seed value for fresh leads)
  chat: ChatMessage[];

  // Fields the agent computes. Recomputed any time the chat changes.
  tag: Tag;
  reason: string;
  nextFollowUpDate: string; // ISO date (YYYY-MM-DD)
  draftMessage: string;
  draftEditedByRep: boolean;
  lastSentAt: string | null; // ISO date, last time rep marked a draft as sent
}

export type NewLeadInput = {
  name: string;
  company: string;
  phone: string;
  source: string;
  product: string;
  firstMessage?: { sender: Sender; text: string };
};
