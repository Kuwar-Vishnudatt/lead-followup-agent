import { ChatMessage, Lead, NewLeadInput, Sender } from "./types";
import { generateSampleLeads } from "./sampleData";
import { runAgent } from "./agent";
import { toDateOnly } from "./dateUtils";

const STORAGE_KEY = "lead-followup-agent:leads:v1";

// Stable empty array returned during SSR, before localStorage can be read.
export const SERVER_SNAPSHOT: Lead[] = [];

type Listener = () => void;
let listeners: Listener[] = [];
let cache: Lead[] | null = null;

function readFromStorage(): Lead[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Lead[];
  } catch {
    // fall through to reseed
  }
  const seeded = generateSampleLeads(new Date());
  persist(seeded);
  return seeded;
}

function persist(leads: Lead[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch {
    // ignore quota / private-mode errors
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getSnapshot(): Lead[] {
  if (cache === null) cache = readFromStorage();
  return cache;
}

export function getServerSnapshot(): Lead[] {
  return SERVER_SNAPSHOT;
}

function setLeads(updater: (prev: Lead[]) => Lead[]) {
  const prev = cache ?? readFromStorage();
  const next = updater(prev);
  cache = next;
  persist(next);
  listeners.forEach((l) => l());
}

function recompute(lead: Lead, now: Date): Lead {
  const result = runAgent(
    { name: lead.name, product: lead.product, lastContactDate: lead.lastContactDate, chat: lead.chat },
    now
  );
  return {
    ...lead,
    tag: result.tag,
    reason: result.reason,
    nextFollowUpDate: result.nextFollowUpDate,
    draftMessage: lead.draftEditedByRep ? lead.draftMessage : result.draftMessage,
  };
}

export function addLead(input: NewLeadInput) {
  const now = new Date();
  const chat: ChatMessage[] = input.firstMessage
    ? [{ id: `msg-${Date.now()}`, sender: input.firstMessage.sender, text: input.firstMessage.text, date: now.toISOString() }]
    : [];

  const base: Lead = {
    id: `lead-${Date.now()}`,
    name: input.name,
    company: input.company,
    phone: input.phone,
    source: input.source,
    product: input.product,
    createdAt: now.toISOString(),
    lastContactDate: now.toISOString(),
    chat,
    tag: "Warm",
    reason: "",
    nextFollowUpDate: toDateOnly(now),
    draftMessage: "",
    draftEditedByRep: false,
    lastSentAt: null,
  };

  setLeads((prev) => [recompute(base, now), ...prev]);
}

export function addMessage(leadId: string, sender: Sender, text: string) {
  const now = new Date();
  setLeads((prev) =>
    prev.map((lead) => {
      if (lead.id !== leadId) return lead;
      const chat = [...lead.chat, { id: `msg-${Date.now()}`, sender, text, date: now.toISOString() }];
      return recompute({ ...lead, chat, lastContactDate: now.toISOString(), draftEditedByRep: false }, now);
    })
  );
}

export function updateDraft(leadId: string, text: string) {
  setLeads((prev) =>
    prev.map((lead) => (lead.id === leadId ? { ...lead, draftMessage: text, draftEditedByRep: true } : lead))
  );
}

export function markSent(leadId: string) {
  const now = new Date();
  setLeads((prev) =>
    prev.map((lead) => {
      if (lead.id !== leadId) return lead;
      const chat = [
        ...lead.chat,
        { id: `msg-${Date.now()}`, sender: "rep" as Sender, text: lead.draftMessage, date: now.toISOString() },
      ];
      return recompute(
        { ...lead, chat, lastContactDate: now.toISOString(), lastSentAt: toDateOnly(now), draftEditedByRep: false },
        now
      );
    })
  );
}

export function resetDemoData() {
  const seeded = generateSampleLeads(new Date());
  cache = seeded;
  persist(seeded);
  listeners.forEach((l) => l());
}
