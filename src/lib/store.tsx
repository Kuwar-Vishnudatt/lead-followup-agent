"use client";

import { useSyncExternalStore } from "react";
import * as leadsStore from "./leadsStore";

export function useStore() {
  const leads = useSyncExternalStore(
    leadsStore.subscribe,
    leadsStore.getSnapshot,
    leadsStore.getServerSnapshot
  );
  const loaded = leads !== leadsStore.SERVER_SNAPSHOT;

  return {
    leads,
    loaded,
    addLead: leadsStore.addLead,
    addMessage: leadsStore.addMessage,
    updateDraft: leadsStore.updateDraft,
    markSent: leadsStore.markSent,
  };
}
