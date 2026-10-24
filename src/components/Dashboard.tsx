"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/useNow";
import { daysBetween, parseDateOnly, startOfDay } from "@/lib/dateUtils";
import { Lead, Tag } from "@/lib/types";
import LeadRow from "./LeadRow";
import LeadDetail from "./LeadDetail";
import AddLeadModal from "./AddLeadModal";

const TAG_ORDER: Record<Tag, number> = { Hot: 0, Warm: 1, Cold: 2 };

function sortLeads(leads: Lead[], now: Date): Lead[] {
  return [...leads].sort((a, b) => {
    const diffA = daysBetween(startOfDay(now), startOfDay(parseDateOnly(a.nextFollowUpDate)));
    const diffB = daysBetween(startOfDay(now), startOfDay(parseDateOnly(b.nextFollowUpDate)));
    if (diffA !== diffB) return diffA - diffB;
    return TAG_ORDER[a.tag] - TAG_ORDER[b.tag];
  });
}

type Filter = "all" | "overdue" | "today" | Tag;

export default function Dashboard() {
  const { leads, loaded } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const now = useNow();

  const sorted = useMemo(() => (now ? sortLeads(leads, now) : []), [leads, now]);

  const counts = useMemo(() => {
    if (!now) return { overdue: 0, today: 0, hot: 0, total: 0 };
    let overdue = 0;
    let today = 0;
    let hot = 0;
    for (const lead of leads) {
      const diff = daysBetween(startOfDay(now), startOfDay(parseDateOnly(lead.nextFollowUpDate)));
      if (diff < 0) overdue += 1;
      else if (diff === 0) today += 1;
      if (lead.tag === "Hot") hot += 1;
    }
    return { overdue, today, hot, total: leads.length };
  }, [leads, now]);

  const filtered = useMemo(() => {
    if (!now) return [];
    return sorted.filter((lead) => {
      const diff = daysBetween(startOfDay(now), startOfDay(parseDateOnly(lead.nextFollowUpDate)));
      if (filter === "overdue") return diff < 0;
      if (filter === "today") return diff === 0;
      if (filter === "Hot" || filter === "Warm" || filter === "Cold") return lead.tag === filter;
      return true;
    });
  }, [sorted, filter, now]);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  if (!loaded || !now) {
    return <div className="flex h-screen items-center justify-center text-gray-400">Loading leads…</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Today&apos;s Follow-ups</h1>
          <p className="text-sm text-gray-500">Who to call today, and what to say.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add lead
        </button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-white px-6 py-3">
        <StatChip label="All" value={counts.total} active={filter === "all"} onClick={() => setFilter("all")} />
        <StatChip
          label="Overdue"
          value={counts.overdue}
          active={filter === "overdue"}
          onClick={() => setFilter("overdue")}
          tone="red"
        />
        <StatChip
          label="Due today"
          value={counts.today}
          active={filter === "today"}
          onClick={() => setFilter("today")}
          tone="amber"
        />
        <StatChip label="Hot" value={counts.hot} active={filter === "Hot"} onClick={() => setFilter("Hot")} tone="red" />
        <StatChip label="Warm" value={leads.filter((l) => l.tag === "Warm").length} active={filter === "Warm"} onClick={() => setFilter("Warm")} tone="amber" />
        <StatChip label="Cold" value={leads.filter((l) => l.tag === "Cold").length} active={filter === "Cold"} onClick={() => setFilter("Cold")} tone="sky" />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={`w-full overflow-y-auto border-r border-gray-200 lg:w-[420px] ${selectedLead ? "hidden lg:block" : "block"}`}>
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">No leads match this filter.</p>
          ) : (
            filtered.map((lead) => (
              <LeadRow key={lead.id} lead={lead} now={now} selected={lead.id === selectedId} onClick={() => setSelectedId(lead.id)} />
            ))
          )}
        </div>

        <div className={`min-w-0 flex-1 ${selectedLead ? "block" : "hidden lg:flex"}`}>
          {selectedLead ? (
            <LeadDetail key={selectedLead.id} lead={selectedLead} now={now} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Select a lead to see the chat, tag, and draft message.
            </div>
          )}
        </div>
      </div>

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function StatChip({
  label,
  value,
  active,
  onClick,
  tone,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  tone?: "red" | "amber" | "sky";
}) {
  const toneClass =
    tone === "red"
      ? "text-red-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "sky"
          ? "text-sky-600"
          : "text-gray-700";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "border-gray-800 bg-gray-900 text-white" : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <span className={active ? "text-white" : toneClass}>{value}</span>
      <span className={active ? "text-white" : "text-gray-500"}>{label}</span>
    </button>
  );
}
