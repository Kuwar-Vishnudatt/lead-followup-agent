import { Tag } from "@/lib/types";

const STYLES: Record<Tag, string> = {
  Hot: "bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20",
  Warm: "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  Cold: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-600/20",
};

const DOT: Record<Tag, string> = {
  Hot: "bg-red-500",
  Warm: "bg-amber-500",
  Cold: "bg-sky-500",
};

export default function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[tag]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[tag]}`} />
      {tag}
    </span>
  );
}
