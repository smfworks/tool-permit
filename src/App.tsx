import { SAMPLES } from "./data/samples";
import {
  addTool,
  canExport,
  cloneDraft,
  permitToJson,
  removeTool,
  serializePermit,
  slugify,
} from "./lib/permit";
import {
  cardToPngBlob,
  copyText,
  downloadBlob,
} from "./lib/exportImage";
import { EMPTY_DRAFT, type PermitDraft } from "./types";
import { Actions } from "./components/Actions";
import { Composer } from "./components/Composer";
import { Header } from "./components/Header";
import { PermitCard } from "./components/PermitCard";
import { SisterStrip } from "./components/SisterStrip";
import { HandoffBanner } from "./components/HandoffBanner";
import { Toast } from "./components/Toast";
import { formatCompactStats, formatShareText } from "./lib/share";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function initialFromUrl(): { draft: PermitDraft; sampleId: string | null } {
  const params = new URLSearchParams(window.location.search);
  const sample = params.get("sample");
  const found = SAMPLES.find((item) => item.id === sample);
  if (!found) return { draft: cloneDraft(), sampleId: null };
  return { draft: cloneDraft(found.draft), sampleId: found.id };
}

function applyShotClass(): void {
  const shot = new URLSearchParams(window.location.search).get("shot");
  if (shot === "card" || shot === "og") {
    document.body.classList.add(`shot-${shot}`);
  }
}

export default function App() {
  applyShotClass();
  const [draft, setDraft] = useState<PermitDraft>(() => initialFromUrl().draft);
  const [sampleId, setSampleId] = useState<string | null>(() => initialFromUrl().sampleId);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "share" | "json" | null>(null);
  const [now] = useState(() => new Date());
  const frameRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const loadSample = useCallback((id: string) => {
    const sample = SAMPLES.find((item) => item.id === id);
    if (!sample) return;
    setDraft(cloneDraft(sample.draft));
    setSampleId(id);
  }, []);

  const permit = useMemo(() => serializePermit(draft, now), [draft, now]);
  const exportable = canExport(permit);

  const reset = useCallback(() => {
    setDraft(cloneDraft(EMPTY_DRAFT));
    setSampleId(null);
    showToast("Cleared.");
  }, [showToast]);

  const withFrame = useCallback(async () => {
    const node = frameRef.current;
    if (!node || !exportable) throw new Error("Nothing to stamp yet.");
    node.classList.add("is-exporting");
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    try {
      return await cardToPngBlob(node);
    } finally {
      node.classList.remove("is-exporting");
    }
  }, [exportable]);

  const downloadPng = useCallback(async () => {
    if (!exportable) return;
    setBusy("png");
    try {
      const blob = await withFrame();
      downloadBlob(blob, `tool-permit-${slugify(permit.agent)}.png`);
      showToast("PNG downloaded.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "PNG export failed.");
    } finally {
      setBusy(null);
    }
  }, [exportable, permit.agent, showToast, withFrame]);

  const copyShare = useCallback(async () => {
    if (!exportable) return;
    setBusy("share");
    try {
      await copyText(formatShareText(permit));
      showToast("Share text copied.");
    } catch {
      showToast("Could not copy share text.");
    } finally {
      setBusy(null);
    }
  }, [exportable, permit, showToast]);

  const copyJson = useCallback(async () => {
    if (!exportable) return;
    setBusy("json");
    try {
      await copyText(permitToJson(permit));
      showToast("JSON copied.");
    } catch {
      showToast("Could not copy JSON.");
    } finally {
      setBusy(null);
    }
  }, [exportable, permit, showToast]);

  const onChange = useCallback((next: PermitDraft) => {
    setSampleId(null);
    setDraft(next);
  }, []);

  const onAddAllowed = useCallback((raw: string) => {
    const next = addTool(draft.allowed, raw);
    if (next.length === draft.allowed.length) return false;
    setSampleId(null);
    setDraft({
      ...draft,
      allowed: next,
      denied: removeTool(draft.denied, raw),
    });
    return true;
  }, [draft]);

  const onRemoveAllowed = useCallback((id: string) => {
    setSampleId(null);
    setDraft({ ...draft, allowed: removeTool(draft.allowed, id) });
  }, [draft]);

  const onAddDenied = useCallback((raw: string) => {
    const next = addTool(draft.denied, raw);
    if (next.length === draft.denied.length) return false;
    setSampleId(null);
    setDraft({
      ...draft,
      denied: next,
      allowed: removeTool(draft.allowed, raw),
    });
    return true;
  }, [draft]);

  const onRemoveDenied = useCallback((id: string) => {
    setSampleId(null);
    setDraft({ ...draft, denied: removeTool(draft.denied, id) });
  }, [draft]);

  const onToggleAllowed = useCallback((id: string) => {
    setSampleId(null);
    if (draft.allowed.includes(id)) {
      setDraft({ ...draft, allowed: removeTool(draft.allowed, id) });
      return;
    }
    setDraft({
      ...draft,
      allowed: addTool(draft.allowed, id),
      denied: removeTool(draft.denied, id),
    });
  }, [draft]);

  const live = useMemo(() => {
    if (!exportable) return "Waiting for a permit";
    return `${permit.agent} · ${permit.allowed.length} allowed`;
  }, [exportable, permit.agent, permit.allowed.length]);

  return (
    <div className="page">
      <div className="ambient" aria-hidden="true" />
      <Header />
      <SisterStrip current="tool-permit" payload={JSON.stringify(draft)} kind="json" />
      <HandoffBanner
        accept={["json", "plain"]}
        onPaste={(text) => {
          try {
            const parsed = JSON.parse(text) as Record<string, unknown>;
            const source = (
              parsed.draft && typeof parsed.draft === "object" ? parsed.draft : parsed
            ) as Partial<PermitDraft>;
            setDraft(
              cloneDraft({
                ...EMPTY_DRAFT,
                ...source,
                allowed: Array.isArray(source.allowed) ? source.allowed.map(String) : EMPTY_DRAFT.allowed,
                denied: Array.isArray(source.denied) ? source.denied.map(String) : EMPTY_DRAFT.denied,
              }),
            );
            setSampleId(null);
          } catch {
            /* not JSON — this app has no freeform paste box */
          }
        }}
      />
      <main className="layout">
        <Composer
          draft={draft}
          sampleId={sampleId}
          onChange={onChange}
          onSample={loadSample}
          onAddAllowed={onAddAllowed}
          onRemoveAllowed={onRemoveAllowed}
          onAddDenied={onAddDenied}
          onRemoveDenied={onRemoveDenied}
          onToggleAllowed={onToggleAllowed}
        />
        <section className="stage" aria-label="Permit preview">
          <p className="sr-only" aria-live="polite">
            {live}
          </p>
          <div className="stage-scroll">
            <div ref={frameRef} className="export-frame">
              <PermitCard permit={permit.agent || permit.allowed.length ? permit : null} />
            </div>
          </div>
          {exportable ? <p className="stage-stats">{formatCompactStats(permit)}</p> : null}
          <Actions
            disabled={!exportable}
            busy={busy}
            onDownload={() => void downloadPng()}
            onCopyShare={() => void copyShare()}
            onCopyJson={() => void copyJson()}
            onReset={reset}
          />
        </section>
      </main>
      <footer className="site-foot">
        <p>Tool Permit · SMF Works</p>
        <p>
          Twin:{" "}
          <a href="https://github.com/smfworks/refuse-card">Refuse Card</a>
          {" — NO / HOLD · "}
          <a href="https://github.com/smfworks/agent-receipt">Agent Receipt</a>
          {" — what happened."}
        </p>
        <p>Intelligence is abundant. Judgment is the product.</p>
        <p>
          MIT · Built by{" "}
          <a href="https://smfworks.com" rel="noreferrer" target="_blank">
            SMF Works
          </a>
          {" · "}
          <a href="https://github.com/smfworks/tool-permit" rel="noreferrer" target="_blank">
            GitHub
          </a>
          {" · "}
          <a href="https://x.com/MichaelGannotti" rel="noreferrer" target="_blank">
            @MichaelGannotti
          </a>
        </p>
        <p className="fineprint">
          Lab artifact for communication. Not an enforcement runtime, not a
          sandbox, and not a security boundary by itself. A shareable allowlist
          is not an audit and not a substitute for human review.
        </p>
      </footer>
      <Toast message={toast} />
    </div>
  );
}
