import { useSyncExternalStore } from "react";

// `new Date()` must never run during server prerendering (Next.js blocks it
// for Client Components), so — same pattern as leadsStore — "now" is read
// from an external snapshot that's only populated on the client.
let cached: Date | null = null;

function getSnapshot(): Date | null {
  if (cached === null) cached = new Date();
  return cached;
}

function getServerSnapshot(): Date | null {
  return null;
}

function subscribe(): () => void {
  return () => {};
}

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
