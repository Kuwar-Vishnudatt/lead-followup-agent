"use client";

import { useState } from "react";
import { Sender } from "@/lib/types";
import { useStore } from "@/lib/store";

const SOURCES = ["Website", "Referral", "Trade Show", "Cold Call", "WhatsApp Inbound", "LinkedIn"];

export default function AddLeadModal({ onClose }: { onClose: () => void }) {
  const { addLead } = useStore();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState(SOURCES[0]);
  const [product, setProduct] = useState("");
  const [sender, setSender] = useState<Sender>("buyer");
  const [firstMessage, setFirstMessage] = useState("");

  const canSubmit = name.trim() && company.trim() && product.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    addLead({
      name: name.trim(),
      company: company.trim(),
      phone: phone.trim() || "—",
      source,
      product: product.trim(),
      firstMessage: firstMessage.trim() ? { sender, text: firstMessage.trim() } : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add a new lead</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Name *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Jane Doe" />
          </Field>
          <Field label="Company *">
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} placeholder="Acme Pvt Ltd" />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Source">
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Product interest *">
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className={inputClass}
              placeholder="Shrink Wrap Machine"
            />
          </Field>
          <Field label="First message (optional)">
            <div className="flex gap-2">
              <select
                value={sender}
                onChange={(e) => setSender(e.target.value as Sender)}
                className="rounded-md border border-gray-200 px-2 py-2 text-sm"
              >
                <option value="buyer">Buyer said</option>
                <option value="rep">I said</option>
              </select>
              <input
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                className={`${inputClass} flex-1`}
                placeholder="e.g. Interested, please send pricing"
              />
            </div>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add lead
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}
