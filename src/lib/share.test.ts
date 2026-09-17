import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SAMPLES } from "../data/samples.ts";
import { serializePermit } from "./permit.ts";
import { formatCompactStats, formatShareText, formatStampTime } from "./share.ts";

const frozen = new Date("2026-09-17T11:15:00.000Z");

describe("formatShareText", () => {
  it("prints a GO allowlist block for lab sandbox", () => {
    const permit = serializePermit(SAMPLES[0].draft, frozen);
    const text = formatShareText(permit);
    assert.match(text, /^🟢 GO · Tool Permit/);
    assert.match(text, /Sandbox Lab/);
    assert.match(text, /ALLOWED: shell · browser · read · write · git/);
    assert.match(text, /DENIED: deploy · payments · email/);
    assert.match(text, /Expiry: This session/);
    assert.match(text, /github.com\/smfworks\/tool-permit/);
  });

  it("omits an empty denied line", () => {
    const permit = serializePermit(
      { ...SAMPLES[0].draft, denied: [] },
      frozen,
    );
    const text = formatShareText(permit);
    assert.equal(text.includes("DENIED:"), false);
  });
});

describe("formatCompactStats", () => {
  it("summarizes counts and expiry", () => {
    const session = serializePermit(SAMPLES[0].draft, frozen);
    const dated = serializePermit(SAMPLES[1].draft, frozen);
    assert.equal(formatCompactStats(session), "5 allowed · 3 denied · session");
    assert.equal(formatCompactStats(dated), "5 allowed · 4 denied · 2026-12-31");
  });
});

describe("formatStampTime", () => {
  it("prints a UTC lab stamp", () => {
    assert.equal(formatStampTime(frozen.toISOString()), "17 Sep 2026 · 11:15 UTC");
  });
});
