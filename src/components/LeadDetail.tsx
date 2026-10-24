"use client";

import { useState } from "react";
import { Lead, Sender } from "@/lib/types";
import { formatDateTime, formatRelativeLabel, isOverdue } from "@/lib/dateUtils";
import { useStore } from "@/lib/store";
import TagBadge from "./TagBadge";

export default function LeadDetail({ lead, now, onClose }: { lead: Lead; now: Date; onClose: () => void }) {
  const { addMessage, updateDraft, markSent } = useStore();
  const [newMsgSender, setNewMsgSender] = useState<Sender>("buyer");
  const [newMsgText, setNewMsgText] = useState("");
  const [justSent, setJustSent] = useState(false);

  // The draft textarea is a controlled input bound straight to store state:
  // the agent writes to it on every chat update, the rep's edits write to it
  // on every keystroke. No local component state needed.
  const draft = lead.draftMessage;

  const overdue = isOverdue(lead.nextFollowUpDate, now);

  function handleDraftChange(value: string) {
    updateDraft(lead.id, value);
  }

  function handleMarkSent() {
    markSent(lead.id);
    setJustSent(true);
    setTimeout(() => setJustSent(false), 2000);
  }

  function handleAddMessage() {
    if (!newMsgText.trim()) return;
    addMessage(lead.id, newMsgSender, newMsgText.trim());
    setNewMsgText("");
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{lead.name}</h2>
            <TagBadge tag={lead.tag} />
          </div>
          <p className="text-sm text-gray-500">{lead.company}</p>
          <p className="text-sm text-gray-400">
            {lead.phone} · {lead.source} · Interested in {lead.product}
          </p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden">
          ✕
        </button>
      </div>

      <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Why this tag:</span> {lead.reason}
        </p>
        <p className={`mt-1 text-sm font-medium ${overdue ? "text-red-600" : "text-gray-600"}`}>
          Next follow-up: {formatRelativeLabel(lead.nextFollowUpDate, now)} ({lead.nextFollowUpDate})
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {lead.chat.length === 0 ? (
          <p className="text-sm italic text-gray-400">No conversation yet. This is a fresh lead — reach out today.</p>
        ) : (
          <div className="space-y-3">
            {lead.chat.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "rep" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    msg.sender === "rep"
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-bl-sm bg-gray-100 text-gray-800"
                  }`}
                >
                  <p>{msg.text}</p>
                  <p className={`mt-1 text-[10px] ${msg.sender === "rep" ? "text-blue-100" : "text-gray-400"}`}>
                    {msg.sender === "rep" ? "You" : lead.name.split(" ")[0]} · {formatDateTime(msg.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-5 py-3">
        <div className="mb-2 flex gap-2">
          <select
            value={newMsgSender}
            onChange={(e) => setNewMsgSender(e.target.value as Sender)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600"
          >
            <option value="buyer">Buyer said…</option>
            <option value="rep">I said…</option>
          </select>
          <input
            value={newMsgText}
            onChange={(e) => setNewMsgText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddMessage();
            }}
            placeholder="Log a new WhatsApp message to update the agent's tag…"
            className="flex-1 rounded-md border border-gray-200 px-3 py-1 text-xs focus:border-blue-400 focus:outline-none"
          />
          <button
            onClick={handleAddMessage}
            className="rounded-md bg-gray-800 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
          >
            Add
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Draft follow-up message
        </label>
        <textarea
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {lead.lastSentAt ? `Last sent ${lead.lastSentAt}` : "Not sent yet"}
          </span>
          <button
            onClick={handleMarkSent}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {justSent ? "Sent ✓" : "Mark as Sent"}
          </button>
        </div>
      </div>
    </div>
  );
}
