import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { SAMPLES } from "../data/samples.ts";
import { EMPTY_DRAFT, PERMIT_SCHEMA, type PermitDraft } from "../types.ts";
import {
  addTool,
  canExport,
  cardId,
  draftFromPermit,
  normalizeTool,
  parsePermitObject,
  parsePermitText,
  partitionTools,
  permitToJson,
  removeTool,
  serializePermit,
  slugify,
  uniqueTools,
} from "./permit.ts";

const sampleDir = join(fileURLToPath(new URL(".", import.meta.url)), "../../public/samples");
const frozen = new Date("2026-09-17T11:15:00.000Z");

function loadPublicSample(id: string): unknown {
  return JSON.parse(readFileSync(join(sampleDir, `${id}.json`), "utf8"));
}

describe("normalizeTool", () => {
  it("slugs mixed case, spaces, and punctuation", () => {
    assert.equal(normalizeTool("  Shell "), "shell");
    assert.equal(normalizeTool("Read File"), "read-file");
    assert.equal(normalizeTool("git_status"), "git-status");
    assert.equal(normalizeTool("MCP!"), "mcp");
  });

  it("rejects empty or overlong names", () => {
    assert.equal(normalizeTool("   "), null);
    assert.equal(normalizeTool("!!!"), null);
    assert.equal(normalizeTool("x".repeat(41)), null);
  });
});

describe("partitionTools", () => {
  it("dedupes and lets denied win on overlap", () => {
    const { allowed, denied } = partitionTools(
      ["shell", "SHELL", "write", "payments"],
      ["payments", "email", "payments"],
    );
    assert.deepEqual(allowed, ["shell", "write"]);
    assert.deepEqual(denied, ["payments", "email"]);
  });

  it("preserves first-seen order", () => {
    assert.deepEqual(uniqueTools(["git", "read", "git", "browser"]), [
      "git",
      "read",
      "browser",
    ]);
  });
});

describe("addTool / removeTool", () => {
  it("appends a new slug once", () => {
    const next = addTool(["read"], "Write");
    assert.deepEqual(next, ["read", "write"]);
    assert.deepEqual(addTool(next, "write"), ["read", "write"]);
  });

  it("removes by normalized name", () => {
    assert.deepEqual(removeTool(["read", "write"], "WRITE"), ["read"]);
  });
});

describe("serializePermit", () => {
  it("emits a stable v1 allowlist document", () => {
    const draft: PermitDraft = {
      agent: "Sandbox Lab",
      project: "hermes-scratch",
      scope: "Local experiments.",
      expiryKind: "session",
      expiryDate: "ignored",
      allowed: ["shell", "browser", "read"],
      denied: ["deploy"],
    };
    const permit = serializePermit(draft, frozen);
    assert.equal(permit.schema, PERMIT_SCHEMA);
    assert.match(permit.id, /^TP-[0-9A-F]{4}$/);
    assert.equal(permit.issuedAt, frozen.toISOString());
    assert.equal(permit.heuristic, true);
    assert.deepEqual(permit.expiry, { kind: "session" });
    assert.deepEqual(permit.allowed, ["shell", "browser", "read"]);
    assert.deepEqual(permit.denied, ["deploy"]);
    assert.equal(canExport(permit), true);
  });

  it("keeps a dated expiry when YYYY-MM-DD is present", () => {
    const permit = serializePermit(
      {
        ...EMPTY_DRAFT,
        agent: "Docs Scribe",
        expiryKind: "date",
        expiryDate: "2026-12-31",
        allowed: ["read"],
      },
      frozen,
    );
    assert.deepEqual(permit.expiry, { kind: "date", date: "2026-12-31" });
  });

  it("falls back to session when the date is blank or invalid", () => {
    const blank = serializePermit(
      { ...EMPTY_DRAFT, agent: "A", expiryKind: "date", expiryDate: "", allowed: ["read"] },
      frozen,
    );
    const bad = serializePermit(
      { ...EMPTY_DRAFT, agent: "A", expiryKind: "date", expiryDate: "soon", allowed: ["read"] },
      frozen,
    );
    assert.deepEqual(blank.expiry, { kind: "session" });
    assert.deepEqual(bad.expiry, { kind: "session" });
  });

  it("is deterministic for the same draft + clock", () => {
    const draft = SAMPLES[0].draft;
    const a = serializePermit(draft, frozen);
    const b = serializePermit(draft, frozen);
    assert.deepEqual(a, b);
  });

  it("changes the serial when the allowlist changes", () => {
    const base = serializePermit(SAMPLES[0].draft, frozen);
    const tweaked = serializePermit(
      { ...SAMPLES[0].draft, allowed: [...SAMPLES[0].draft.allowed, "mcp"] },
      frozen,
    );
    assert.notEqual(base.id, tweaked.id);
  });

  it("does not export an empty agent or empty allowlist", () => {
    const noAgent = serializePermit({ ...EMPTY_DRAFT, allowed: ["read"] }, frozen);
    const noTools = serializePermit({ ...EMPTY_DRAFT, agent: "Nameless" }, frozen);
    assert.equal(canExport(noAgent), false);
    assert.equal(canExport(noTools), false);
  });
});

describe("JSON roundtrip", () => {
  it("parses its own pretty JSON", () => {
    const permit = serializePermit(SAMPLES[2].draft, frozen);
    const parsed = parsePermitText(permitToJson(permit));
    assert.ok(parsed);
    const again = serializePermit(parsed, frozen);
    assert.deepEqual(again.allowed, permit.allowed);
    assert.deepEqual(again.denied, permit.denied);
    assert.deepEqual(again.expiry, permit.expiry);
    assert.equal(again.agent, permit.agent);
    assert.equal(again.project, permit.project);
    assert.equal(again.scope, permit.scope);
  });

  it("accepts allowlist / refused aliases", () => {
    const parsed = parsePermitObject({
      issuedFor: "Alias Bot",
      allowlist: ["Shell", "Read"],
      refused: ["payments"],
      expiryKind: "date",
      expiryDate: "2026-10-01",
    });
    assert.ok(parsed);
    assert.equal(parsed.agent, "Alias Bot");
    assert.deepEqual(parsed.allowed, ["shell", "read"]);
    assert.deepEqual(parsed.denied, ["payments"]);
    assert.equal(parsed.expiryKind, "date");
    assert.equal(parsed.expiryDate, "2026-10-01");
  });

  it("returns null for empty / non-JSON", () => {
    assert.equal(parsePermitText("   "), null);
    assert.equal(parsePermitText("not json"), null);
    assert.equal(parsePermitObject({}), null);
  });

  it("draftFromPermit roundtrips into serializePermit", () => {
    const permit = serializePermit(SAMPLES[1].draft, frozen);
    const draft = draftFromPermit(permit);
    const again = serializePermit(draft, frozen);
    assert.deepEqual(again.allowed, permit.allowed);
    assert.deepEqual(again.denied, permit.denied);
    assert.deepEqual(again.expiry, permit.expiry);
  });
});

describe("public samples", () => {
  for (const sample of SAMPLES) {
    it(`${sample.id} JSON matches the in-app draft after serialize`, () => {
      const file = loadPublicSample(sample.id);
      const fromFile = parsePermitObject(file);
      assert.ok(fromFile, `failed to parse ${sample.id}.json`);
      const expected = serializePermit(sample.draft, frozen);
      const actual = serializePermit(fromFile, frozen);
      assert.deepEqual(actual.allowed, expected.allowed);
      assert.deepEqual(actual.denied, expected.denied);
      assert.deepEqual(actual.expiry, expected.expiry);
      assert.equal(actual.agent, expected.agent);
      assert.equal(actual.project, expected.project);
      assert.equal(actual.scope, expected.scope);
      assert.equal(canExport(actual), true);
      assert.ok(actual.allowed.length >= 3, "sample should ship a real allowlist");
    });
  }

  it("ships four named samples", () => {
    assert.deepEqual(
      SAMPLES.map((sample) => sample.id),
      ["lab-sandbox", "docs-only", "full-ship-crew", "read-only-researcher"],
    );
  });
});

describe("helpers", () => {
  it("builds a stable TP id", () => {
    assert.equal(cardId("same"), cardId("same"));
    assert.notEqual(cardId("same"), cardId("other"));
    assert.match(cardId("same"), /^TP-[0-9A-F]{4}$/);
  });

  it("slugifies download names", () => {
    assert.equal(slugify("Sandbox Lab"), "sandbox-lab");
    assert.equal(slugify("   "), "permit");
  });
});
