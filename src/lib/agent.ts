import { ChatMessage, Tag } from "./types";
import { addDays, daysBetween, extractDateHint, toDateOnly } from "./dateUtils";

/**
 * The "agent" is a deterministic, explainable scoring engine rather than an
 * LLM call. For a live sales dashboard that has to work every time a reviewer
 * opens it, a transparent rule-based model is more reliable than depending on
 * an external API staying up, and it is easy to explain exactly why a lead
 * got its tag. See NOTE.md for the full reasoning.
 */

type Kind = "positive" | "negative" | "stall" | "recency" | "ghost";

interface Factor {
  text: string;
  weight: number;
  kind: Kind;
}

const POSITIVE_PHRASES: { phrase: string; weight: number; label: string }[] = [
  { phrase: "purchase order", weight: 38, label: "Buyer sent a purchase order" },
  { phrase: "po number", weight: 38, label: "Buyer referenced a PO number" },
  { phrase: "place the order", weight: 36, label: "Buyer wants to place the order" },
  { phrase: "confirm the order", weight: 36, label: "Buyer is confirming the order" },
  { phrase: "ready to order", weight: 34, label: "Buyer said they're ready to order" },
  { phrase: "go ahead", weight: 30, label: "Buyer gave the go-ahead" },
  { phrase: "let's proceed", weight: 30, label: "Buyer wants to proceed" },
  { phrase: "budget approved", weight: 32, label: "Buyer said budget is approved" },
  { phrase: "send proposal", weight: 26, label: "Buyer asked for a proposal" },
  { phrase: "send me the quote", weight: 28, label: "Buyer asked for a quote" },
  { phrase: "send a quote", weight: 28, label: "Buyer asked for a quote" },
  { phrase: "price list", weight: 22, label: "Buyer asked for pricing" },
  { phrase: "how much", weight: 22, label: "Buyer asked how much it costs" },
  { phrase: "schedule a call", weight: 24, label: "Buyer wants to schedule a call" },
  { phrase: "let's do a call", weight: 24, label: "Buyer agreed to a call" },
  { phrase: "book a demo", weight: 26, label: "Buyer wants to book a demo" },
  { phrase: "need this urgently", weight: 30, label: "Buyer needs this urgently" },
  { phrase: "sounds good", weight: 18, label: "Buyer responded positively" },
  { phrase: "yes please", weight: 24, label: "Buyer said yes" },
  { phrase: "interested", weight: 18, label: "Buyer confirmed interest" },
];

const NEGATIVE_PHRASES: { phrase: string; weight: number; label: string }[] = [
  { phrase: "went with another", weight: -45, label: "Buyer went with another supplier" },
  { phrase: "going with another", weight: -45, label: "Buyer is going with another supplier" },
  { phrase: "no longer need", weight: -40, label: "Buyer no longer needs this" },
  { phrase: "not interested", weight: -40, label: "Buyer said they're not interested" },
  { phrase: "please remove", weight: -38, label: "Buyer asked to be removed from outreach" },
  { phrase: "stop messaging", weight: -38, label: "Buyer asked to stop messaging" },
  { phrase: "unsubscribe", weight: -38, label: "Buyer asked to unsubscribe" },
  { phrase: "no budget", weight: -32, label: "Buyer has no budget right now" },
  { phrase: "out of budget", weight: -32, label: "Deal is out of budget" },
  { phrase: "too expensive", weight: -28, label: "Buyer said the price is too high" },
  { phrase: "not a good fit", weight: -30, label: "Buyer said it's not a good fit" },
  { phrase: "maybe next year", weight: -30, label: "Buyer pushed this to next year" },
  { phrase: "on hold", weight: -26, label: "Buyer put this on hold" },
  { phrase: "cancel", weight: -34, label: "Buyer wants to cancel" },
];

const STALL_PHRASES: { phrase: string; weight: number; label: string }[] = [
  { phrase: "checking with my team", weight: -6, label: "Buyer is checking with their team" },
  { phrase: "checking with management", weight: -6, label: "Buyer is checking with management" },
  { phrase: "comparing options", weight: -8, label: "Buyer is comparing other options" },
  { phrase: "still deciding", weight: -8, label: "Buyer is still deciding" },
  { phrase: "let me check", weight: -5, label: "Buyer needs to check internally" },
  { phrase: "will get back to you", weight: -5, label: "Buyer said they'd get back to you" },
  { phrase: "will confirm soon", weight: -4, label: "Buyer will confirm soon" },
  { phrase: "need some time", weight: -6, label: "Buyer asked for more time" },
  { phrase: "busy this week", weight: -6, label: "Buyer is busy this week" },
  { phrase: "call you back", weight: -4, label: "Buyer said they'd call back" },
];

function findLastBuyerMessage(chat: ChatMessage[]): ChatMessage | null {
  for (let i = chat.length - 1; i >= 0; i--) {
    if (chat[i].sender === "buyer") return chat[i];
  }
  return null;
}

// "not interested" must not also score as a positive "interested" hit, so a
// positive-bank match is dropped if a negation word sits just before it.
function isNegated(precedingText: string): boolean {
  return /(\bnot\b|\bnever\b|\bno\b|n't)(\s+\w+){0,2}\s*$/.test(precedingText);
}

function scanPhrases(
  text: string,
  bank: { phrase: string; weight: number; label: string }[],
  kind: Kind
): Factor[] {
  const t = text.toLowerCase();
  const hits: Factor[] = [];
  for (const entry of bank) {
    const idx = t.indexOf(entry.phrase);
    if (idx === -1) continue;
    if (kind === "positive" && isNegated(t.slice(0, idx))) continue;
    hits.push({ text: entry.label, weight: entry.weight, kind });
  }
  return hits;
}

export interface AgentResult {
  tag: Tag;
  reason: string;
  nextFollowUpDate: string;
  draftMessage: string;
  score: number;
}

export function runAgent(
  input: {
    name: string;
    product: string;
    lastContactDate: string;
    chat: ChatMessage[];
  },
  now: Date = new Date()
): AgentResult {
  const firstName = input.name.split(" ")[0];

  if (input.chat.length === 0) {
    return {
      tag: "Warm",
      reason: "New lead, not yet contacted — reach out today to get the conversation started.",
      nextFollowUpDate: toDateOnly(now),
      draftMessage: `Hi ${firstName}, thanks for your interest in our ${input.product} — happy to answer any questions or set up a quick call. What works best for you?`,
      score: 55,
    };
  }

  const lastMsg = input.chat[input.chat.length - 1];
  const lastBuyerMsg = findLastBuyerMessage(input.chat);
  const lastDate = new Date(lastMsg.date);
  const daysSinceLast = daysBetween(lastDate, now);

  const factors: Factor[] = [];

  // What the buyer said most recently is what the rep should react to — a
  // reversal ("actually, not interested") should outweigh whatever came
  // before it, so only the latest buyer message drives the intent signals.
  if (lastBuyerMsg) {
    factors.push(...scanPhrases(lastBuyerMsg.text, POSITIVE_PHRASES, "positive"));
    factors.push(...scanPhrases(lastBuyerMsg.text, NEGATIVE_PHRASES, "negative"));
    factors.push(...scanPhrases(lastBuyerMsg.text, STALL_PHRASES, "stall"));
  }

  // Recency of contact, from either side.
  if (daysSinceLast <= 1) {
    factors.push({ text: "Active conversation in the last day", weight: 10, kind: "recency" });
  } else if (daysSinceLast <= 3) {
    factors.push({ text: "Contacted a few days ago", weight: 0, kind: "recency" });
  } else if (daysSinceLast <= 6) {
    factors.push({ text: `No activity in ${daysSinceLast} days`, weight: -10, kind: "recency" });
  } else if (daysSinceLast <= 13) {
    factors.push({ text: `No activity in ${daysSinceLast} days`, weight: -20, kind: "recency" });
  } else {
    factors.push({ text: `No activity in ${daysSinceLast} days`, weight: -30, kind: "recency" });
  }

  // Ghosted: rep reached out last and buyer hasn't replied in a while.
  if (lastMsg.sender === "rep" && daysSinceLast >= 3) {
    factors.push({
      text: `No reply in ${daysSinceLast} days after your last message`,
      weight: -15,
      kind: "ghost",
    });
  }

  const score = Math.max(
    0,
    Math.min(100, 50 + factors.reduce((sum, f) => sum + f.weight, 0))
  );

  let tag: Tag;
  if (score >= 70) tag = "Hot";
  else if (score >= 40) tag = "Warm";
  else tag = "Cold";

  const reason = pickReason(tag, factors, firstName);
  const nextFollowUpDate = computeNextFollowUp(tag, input.chat);
  const draftMessage = draftFor(tag, factors, firstName, input.product, lastBuyerMsg);

  return { tag, reason, nextFollowUpDate, draftMessage, score };
}

function pickReason(tag: Tag, factors: Factor[], firstName: string): string {
  if (tag === "Hot") {
    const best = factors
      .filter((f) => f.kind === "positive")
      .sort((a, b) => b.weight - a.weight)[0];
    if (best) return `${best.text} — strong buying signal.`;
    return `${firstName} is actively engaged and responding quickly.`;
  }
  if (tag === "Cold") {
    // Prefer an explicit objection, then stalling language, and only fall
    // back to "time since last contact" when nothing more specific was
    // said — a neutral/zero-weight recency entry is never informative
    // enough to explain why a lead went cold on its own.
    const objection = factors
      .filter((f) => f.kind === "negative" || f.kind === "ghost")
      .sort((a, b) => a.weight - b.weight)[0];
    if (objection) return `${objection.text}.`;
    const stall = factors.filter((f) => f.kind === "stall").sort((a, b) => a.weight - b.weight)[0];
    if (stall) return `${stall.text}, and still no clear commitment — lead is cooling.`;
    const recency = factors.find((f) => f.kind === "recency" && f.weight < 0);
    if (recency) return `${recency.text} — lead is going cold.`;
    return `${firstName} has gone quiet with no clear interest.`;
  }
  // Warm
  const stall = factors.sort((a, b) => a.weight - b.weight).find((f) => f.kind === "stall");
  if (stall) return `${stall.text} — needs a gentle nudge.`;
  const positive = factors.find((f) => f.kind === "positive");
  if (positive) return `${positive.text}, but no firm commitment yet.`;
  return `${firstName} is engaged but hasn't given a clear signal either way.`;
}

// A date word only counts as a follow-up instruction if it's attached to a
// scheduling cue ("call Monday", "let's talk next week"). Without this gate,
// something like "we need this by next week" (a delivery deadline) would get
// misread as "don't follow up until next week" — exactly backwards for a
// lead that just said it's urgent.
const SCHEDULING_CUE = /\b(call|talk|connect|touch base|check in|circle back|follow up|catch up|speak|ring|chat|discuss|demo)\b/i;

function computeNextFollowUp(tag: Tag, chat: ChatMessage[]): string {
  // Look for an explicit scheduling date mentioned in the most recent couple of messages.
  const recent = chat.slice(-2);
  for (let i = recent.length - 1; i >= 0; i--) {
    if (!SCHEDULING_CUE.test(recent[i].text)) continue;
    const hint = extractDateHint(recent[i].text, new Date(recent[i].date));
    if (hint) return toDateOnly(hint);
  }

  const lastDate = new Date(chat[chat.length - 1].date);
  const cadenceDays = tag === "Hot" ? 1 : tag === "Warm" ? 3 : 7;
  return toDateOnly(addDays(lastDate, cadenceDays));
}

function draftFor(
  tag: Tag,
  factors: Factor[],
  firstName: string,
  product: string,
  lastBuyerMsg: ChatMessage | null
): string {
  const hasPositive = (phraseLabel: string) =>
    factors.some((f) => f.kind === "positive" && f.text.includes(phraseLabel));
  const hasNegative = (phraseLabel: string) =>
    factors.some((f) => f.kind === "negative" && f.text.includes(phraseLabel));
  const isGhosted = factors.some((f) => f.kind === "ghost");

  if (tag === "Hot") {
    if (hasPositive("order") || hasPositive("PO")) {
      return `Hi ${firstName}, great news on moving forward with the ${product}! I'll get the order details ready — can you confirm the quantity and delivery address so I can send the paperwork today?`;
    }
    if (hasPositive("quote") || hasPositive("pricing")) {
      return `Hi ${firstName}, thanks for your interest in the ${product} — I'll have a formal quote over to you today. Would a quick call this afternoon work to confirm quantities and delivery timeline?`;
    }
    if (hasPositive("agreed to a call")) {
      return `Hi ${firstName}, looking forward to our call on the ${product} — I'll have everything ready to walk through. Let me know if the timing still works or if anything's changed.`;
    }
    return `Hi ${firstName}, following up on the ${product} — sounds like the timing is right. Want to jump on a quick call today to finalize the details?`;
  }

  if (tag === "Cold") {
    if (hasNegative("price")) {
      return `Hi ${firstName}, totally understand budget is tight on the ${product} right now. If anything changes or a leaner package would help, I'm happy to revisit — otherwise I'll check back in a couple of months.`;
    }
    if (hasNegative("another supplier")) {
      return `Hi ${firstName}, thanks for letting me know. If the ${product} setup doesn't work out or you need a backup supplier down the line, I'm here. Wishing you a smooth rollout.`;
    }
    if (isGhosted) {
      return `Hi ${firstName}, haven't heard back in a while on the ${product} — still worth reconnecting, or should I close this out for now? Either way, just let me know.`;
    }
    return `Hi ${firstName}, it's been a while since we spoke about the ${product} — wanted to check if it's still on your radar or if timing has changed.`;
  }

  // Warm
  if (lastBuyerMsg && /checking|team|management|deciding|comparing/i.test(lastBuyerMsg.text)) {
    return `Hi ${firstName}, just checking in on the ${product} — happy to send a one-pager for your team or hop on a call whenever it's useful. No rush, just want to keep this moving.`;
  }
  return `Hi ${firstName}, wanted to check in on the ${product} — any questions I can answer, or would a quick call help move things along?`;
}
