import {
  EMPTY_DRAFT,
  PERMIT_SCHEMA,
  type PermitDraft,
  type PermitExpiry,
  type ToolPermit,
} from "../types.ts";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeTool(raw: string): string | null {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^-+|-+$/g, "");
  if (!slug || slug.length > 40) return null;
  return slug;
}

export function uniqueTools(raw: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const slug = normalizeTool(item);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

export function addTool(list: readonly string[], raw: string): string[] {
  const slug = normalizeTool(raw);
  if (!slug) return [...list];
  if (list.includes(slug)) return [...list];
  return [...list, slug];
}

export function removeTool(list: readonly string[], raw: string): string[] {
  const slug = normalizeTool(raw);
  if (!slug) return [...list];
  return list.filter((item) => item !== slug);
}

export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function cardId(seed: string): string {
  const hex = fnv1a(seed).toString(16).toUpperCase().padStart(8, "0");
  return `TP-${hex.slice(0, 4)}`;
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "permit";
}

export function resolveExpiry(draft: PermitDraft): PermitExpiry {
  if (draft.expiryKind === "date" && DATE_RE.test(draft.expiryDate.trim())) {
    return { kind: "date", date: draft.expiryDate.trim() };
  }
  return { kind: "session" };
}

export function formatExpiry(expiry: PermitExpiry): string {
  if (expiry.kind === "session") return "SESSION";
  return expiry.date;
}

export function expiryLabel(expiry: PermitExpiry): string {
  if (expiry.kind === "session") return "This session";
  return `Until ${expiry.date}`;
}

/**
 * Denied wins on overlap so the GO-list never silently includes a refused tool.
 * Order of first appearance is preserved.
 */
export function partitionTools(
  allowedRaw: readonly string[],
  deniedRaw: readonly string[],
): { allowed: string[]; denied: string[] } {
  const denied = uniqueTools(deniedRaw);
  const deniedSet = new Set(denied);
  const allowed = uniqueTools(allowedRaw).filter((tool) => !deniedSet.has(tool));
  return { allowed, denied };
}

export function serializePermit(
  draft: PermitDraft,
  issuedAt: Date = new Date(),
): ToolPermit {
  const { allowed, denied } = partitionTools(draft.allowed, draft.denied);
  const expiry = resolveExpiry(draft);
  const agent = draft.agent.trim();
  const project = draft.project.trim();
  const scope = draft.scope.trim();
  const issued = issuedAt.toISOString();
  const seed = [
    agent,
    project,
    scope,
    expiry.kind === "session" ? "session" : expiry.date,
    allowed.join(","),
    denied.join(","),
  ].join("|");

  return {
    schema: PERMIT_SCHEMA,
    id: cardId(seed),
    agent,
    project,
    scope,
    expiry,
    allowed,
    denied,
    issuedAt: issued,
    heuristic: true,
  };
}

export function permitToJson(permit: ToolPermit): string {
  return `${JSON.stringify(permit, null, 2)}\n`;
}

export function canExport(permit: ToolPermit): boolean {
  return Boolean(permit.agent) && permit.allowed.length > 0;
}

export function draftFromPermit(permit: ToolPermit): PermitDraft {
  return {
    agent: permit.agent,
    project: permit.project,
    scope: permit.scope,
    expiryKind: permit.expiry.kind,
    expiryDate: permit.expiry.kind === "date" ? permit.expiry.date : "",
    allowed: [...permit.allowed],
    denied: [...permit.denied],
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function readExpiry(value: unknown, fallbackKind: unknown, fallbackDate: unknown): {
  expiryKind: PermitDraft["expiryKind"];
  expiryDate: string;
} {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.kind === "date" && typeof record.date === "string" && DATE_RE.test(record.date)) {
      return { expiryKind: "date", expiryDate: record.date };
    }
    if (record.kind === "session") {
      return { expiryKind: "session", expiryDate: "" };
    }
  }
  if (fallbackKind === "date" && typeof fallbackDate === "string" && DATE_RE.test(fallbackDate)) {
    return { expiryKind: "date", expiryDate: fallbackDate };
  }
  return { expiryKind: "session", expiryDate: "" };
}

export function parsePermitObject(value: unknown): PermitDraft | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const agent =
    (typeof record.agent === "string" && record.agent) ||
    (typeof record.issuedFor === "string" && record.issuedFor) ||
    (typeof record.name === "string" && record.name) ||
    "";
  const project = typeof record.project === "string" ? record.project : "";
  const scope =
    (typeof record.scope === "string" && record.scope) ||
    (typeof record.summary === "string" && record.summary) ||
    "";
  const allowed = asStringArray(record.allowed ?? record.allowlist ?? record.tools);
  const denied = asStringArray(record.denied ?? record.refused ?? record.deny);
  const { expiryKind, expiryDate } = readExpiry(
    record.expiry,
    record.expiryKind,
    record.expiryDate,
  );

  if (!agent.trim() && allowed.length === 0 && denied.length === 0) {
    return null;
  }

  const { allowed: nextAllowed, denied: nextDenied } = partitionTools(allowed, denied);
  return {
    agent: agent.trim(),
    project: project.trim(),
    scope: scope.trim(),
    expiryKind,
    expiryDate,
    allowed: nextAllowed,
    denied: nextDenied,
  };
}

export function parsePermitText(raw: string): PermitDraft | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return parsePermitObject(JSON.parse(trimmed));
  } catch {
    return null;
  }
}

export function cloneDraft(draft: PermitDraft = EMPTY_DRAFT): PermitDraft {
  return {
    ...draft,
    allowed: [...draft.allowed],
    denied: [...draft.denied],
  };
}
