import type { SampleMeta } from "../types.ts";

export const SAMPLES: SampleMeta[] = [
  {
    id: "lab-sandbox",
    file: "/samples/lab-sandbox.json",
    label: "Lab sandbox",
    blurb: "Local scratch · session",
    draft: {
      agent: "Sandbox Lab",
      project: "hermes-scratch",
      scope: "Local experiments. No prod, no money, no outbound.",
      expiryKind: "session",
      expiryDate: "",
      allowed: ["shell", "browser", "read", "write", "git"],
      denied: ["deploy", "payments", "email"],
    },
  },
  {
    id: "docs-only",
    file: "/samples/docs-only.json",
    label: "Docs-only",
    blurb: "Read the corpus · dated",
    draft: {
      agent: "Docs Scribe",
      project: "lab-notebook",
      scope: "Read the corpus. Draft notes. Do not mutate the tree.",
      expiryKind: "date",
      expiryDate: "2026-12-31",
      allowed: ["read", "search", "grep", "glob", "browser"],
      denied: ["write", "shell", "git", "deploy"],
    },
  },
  {
    id: "full-ship-crew",
    file: "/samples/full-ship-crew.json",
    label: "Full ship crew",
    blurb: "Build + PR · session",
    draft: {
      agent: "Ship Crew",
      project: "tool-permit",
      scope: "Build, test, open a PR. Money and public posts stay human.",
      expiryKind: "session",
      expiryDate: "",
      allowed: ["shell", "browser", "read", "write", "edit", "git", "deploy"],
      denied: ["payments", "email"],
    },
  },
  {
    id: "read-only-researcher",
    file: "/samples/read-only-researcher.json",
    label: "Read-only researcher",
    blurb: "Survey only · dated",
    draft: {
      agent: "Read-only Researcher",
      project: "literature-pass",
      scope: "Survey the repo and the web. Hands off the working tree.",
      expiryKind: "date",
      expiryDate: "2026-10-01",
      allowed: ["read", "search", "browser", "grep", "glob"],
      denied: ["write", "shell", "git", "deploy", "payments", "email"],
    },
  },
];
