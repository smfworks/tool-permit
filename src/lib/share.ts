import type { ToolPermit } from "../types.ts";
import { expiryLabel } from "./permit.ts";

const SHARE_URL = "https://github.com/smfworks/tool-permit";

export function formatStampTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${dd} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} · ${hh}:${mm} UTC`;
}

export function formatShareText(permit: ToolPermit): string {
  const allowed = permit.allowed.length
    ? permit.allowed.join(" · ")
    : "(none)";
  const lines = [
    "🟢 GO · Tool Permit",
    permit.agent || "Untitled agent",
    permit.project ? `Project: ${permit.project}` : "",
    `Expiry: ${expiryLabel(permit.expiry)}`,
    "",
    `ALLOWED: ${allowed}`,
  ];
  if (permit.denied.length) {
    lines.push(`DENIED: ${permit.denied.join(" · ")}`);
  }
  if (permit.scope) {
    lines.push("", permit.scope);
  }
  lines.push("", "Tool Permit · SMF Works", SHARE_URL);
  return lines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n");
}

export function formatCompactStats(permit: ToolPermit): string {
  const expiry = permit.expiry.kind === "session" ? "session" : permit.expiry.date;
  const denied = permit.denied.length ? ` · ${permit.denied.length} denied` : "";
  return `${permit.allowed.length} allowed${denied} · ${expiry}`;
}
