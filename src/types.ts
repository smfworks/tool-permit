export type ExpiryKind = "session" | "date";

export type PermitExpiry =
  | { kind: "session" }
  | { kind: "date"; date: string };

export interface PermitDraft {
  agent: string;
  project: string;
  scope: string;
  expiryKind: ExpiryKind;
  expiryDate: string;
  allowed: string[];
  denied: string[];
}

export interface ToolPermit {
  schema: "smf.tool-permit.v1";
  id: string;
  agent: string;
  project: string;
  scope: string;
  expiry: PermitExpiry;
  allowed: string[];
  denied: string[];
  issuedAt: string;
  heuristic: true;
}

export interface SampleMeta {
  id: string;
  file: string;
  label: string;
  blurb: string;
  draft: PermitDraft;
}

export const PERMIT_SCHEMA = "smf.tool-permit.v1" as const;

export const EMPTY_DRAFT: PermitDraft = {
  agent: "",
  project: "",
  scope: "",
  expiryKind: "session",
  expiryDate: "",
  allowed: [],
  denied: [],
};
