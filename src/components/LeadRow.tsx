"use client";

import { Lead } from "@/lib/types";
import { formatRelativeLabel, isOverdue, isToday } from "@/lib/dateUtils";
import TagBadge from "./TagBadge";

export default function LeadRow({
  lead,
  now,
  selected,
  onClick,
}: {
  lead: Lead;
  now: Date;
  selected: boolean;
  onClick: () => void;
}) {
  const overdue = isOverdue(lead.nextFollowUpDate, now);
  const dueToday = isToday(lead.nextFollowUpDate, now);
  const label = formatRelativeLabel(lead.nextFollowUpDate, now);
  const sentToday = lead.lastSentAt === now.toISOString().slice(0, 10);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 ${
        selected ? "bg-blue-50" : "bg-white"
      } ${overdue ? "border-l-4 border-l-red-500" : dueToday ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-transparent"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-gray-900">{lead.name}</span>
            <TagBadge tag={lead.tag} />
          </div>
          <div className="truncate text-sm text-gray-500">{lead.company}</div>
          <div className="mt-1 truncate text-xs text-gray-400">{lead.reason}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`text-xs font-semibold ${
              overdue ? "text-red-600" : dueToday ? "text-amber-600" : "text-gray-400"
            }`}
          >
            {overdue ? `⚠ ${label}` : label}
          </span>
          {sentToday && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
              Sent today ✓
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
