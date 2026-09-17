import { useState, type FormEvent, type KeyboardEvent } from "react";
import { SAMPLES } from "../data/samples";
import { SUGGESTED_TOOLS } from "../data/tools";
import type { ExpiryKind, PermitDraft } from "../types";

interface ComposerProps {
  draft: PermitDraft;
  sampleId: string | null;
  onChange: (next: PermitDraft) => void;
  onSample: (id: string) => void;
  onAddAllowed: (raw: string) => boolean;
  onRemoveAllowed: (id: string) => void;
  onAddDenied: (raw: string) => boolean;
  onRemoveDenied: (id: string) => void;
  onToggleAllowed: (id: string) => void;
}

export function Composer({
  draft,
  sampleId,
  onChange,
  onSample,
  onAddAllowed,
  onRemoveAllowed,
  onAddDenied,
  onRemoveDenied,
  onToggleAllowed,
}: ComposerProps) {
  const [customAllowed, setCustomAllowed] = useState("");
  const [customDenied, setCustomDenied] = useState("");

  const patch = (partial: Partial<PermitDraft>) => {
    onChange({ ...draft, ...partial });
  };

  const submitAllowed = (event?: FormEvent) => {
    event?.preventDefault();
    if (onAddAllowed(customAllowed)) setCustomAllowed("");
  };

  const submitDenied = (event?: FormEvent) => {
    event?.preventDefault();
    if (onAddDenied(customDenied)) setCustomDenied("");
  };

  const onAllowedKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAllowed();
    }
  };

  const onDeniedKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitDenied();
    }
  };

  return (
    <section className="composer">
      <div className="composer-head">
        <h2>Build a permit</h2>
        <p>Pick a sample or name the agent, then tap the tools it may use.</p>
      </div>

      <div className="sample-row" role="list">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            role="listitem"
            className={sampleId === sample.id ? "chip is-on" : "chip"}
            onClick={() => onSample(sample.id)}
          >
            <span className="chip-top">
              <i className="dot is-go" aria-hidden="true" />
              {sample.label}
            </span>
            <small>{sample.blurb}</small>
          </button>
        ))}
      </div>

      <label className="editor-label" htmlFor="agent-input">
        Issued for
      </label>
      <input
        id="agent-input"
        value={draft.agent}
        onChange={(event) => patch({ agent: event.target.value })}
        placeholder="Agent or project name"
        autoComplete="off"
      />

      <label className="editor-label" htmlFor="project-input">
        Project <span className="opt">(optional)</span>
      </label>
      <input
        id="project-input"
        value={draft.project}
        onChange={(event) => patch({ project: event.target.value })}
        placeholder="repo, stack, or desk"
        autoComplete="off"
      />

      <label className="editor-label" htmlFor="scope-input">
        Scope
      </label>
      <input
        id="scope-input"
        value={draft.scope}
        onChange={(event) => patch({ scope: event.target.value })}
        placeholder="One-liner bound on the work"
        autoComplete="off"
      />

      <p className="editor-label" id="expiry-label">
        Expiry
      </p>
      <div
        className={draft.expiryKind === "date" ? "expiry-row has-date" : "expiry-row"}
        role="group"
        aria-labelledby="expiry-label"
      >
        <button
          type="button"
          className={draft.expiryKind === "session" ? "seg is-on" : "seg"}
          onClick={() => patch({ expiryKind: "session" as ExpiryKind })}
        >
          Session
        </button>
        <button
          type="button"
          className={draft.expiryKind === "date" ? "seg is-on" : "seg"}
          onClick={() => patch({ expiryKind: "date" as ExpiryKind })}
        >
          Date
        </button>
        {draft.expiryKind === "date" ? (
          <input
            type="date"
            aria-label="Expiry date"
            value={draft.expiryDate}
            onChange={(event) =>
              patch({ expiryKind: "date", expiryDate: event.target.value })
            }
          />
        ) : null}
      </div>

      <p className="editor-label" id="allowed-label">
        Allowed tools
      </p>
      <div className="suggest-row" role="group" aria-labelledby="allowed-label">
        {SUGGESTED_TOOLS.map((tool) => {
          const on = draft.allowed.includes(tool.id);
          const blocked = draft.denied.includes(tool.id);
          return (
            <button
              key={tool.id}
              type="button"
              className={`suggest ${on ? "is-on" : ""} ${blocked ? "is-blocked" : ""}`}
              title={blocked ? `Denied: ${tool.hint}` : tool.hint}
              aria-pressed={on}
              onClick={() => onToggleAllowed(tool.id)}
            >
              {tool.label}
            </button>
          );
        })}
      </div>

      {draft.allowed.length ? (
        <ul className="picked">
          {draft.allowed.map((tool) => (
            <li key={tool}>
              <span>{tool}</span>
              <button type="button" onClick={() => onRemoveAllowed(tool)} aria-label={`Remove ${tool}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-hint">Tap a chip or add a custom tool name.</p>
      )}

      <form className="add-row" onSubmit={submitAllowed}>
        <input
          value={customAllowed}
          onChange={(event) => setCustomAllowed(event.target.value)}
          onKeyDown={onAllowedKey}
          placeholder="Add a custom tool"
          aria-label="Add a custom allowed tool"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-inline">
          Add
        </button>
      </form>

      <p className="editor-label" id="denied-label">
        Explicitly denied <span className="opt">(optional · Refuse Card contrast)</span>
      </p>
      {draft.denied.length ? (
        <ul className="picked is-deny">
          {draft.denied.map((tool) => (
            <li key={tool}>
              <span>{tool}</span>
              <button type="button" onClick={() => onRemoveDenied(tool)} aria-label={`Remove denied ${tool}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="field-hint">A short NO-list makes the GO-list easier to screenshot.</p>
      )}
      <form className="add-row" onSubmit={submitDenied}>
        <input
          value={customDenied}
          onChange={(event) => setCustomDenied(event.target.value)}
          onKeyDown={onDeniedKey}
          placeholder="e.g. payments, email, deploy"
          aria-label="Add an explicitly denied tool"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-inline">
          Deny
        </button>
      </form>

      <p className="disclaimer">
        Lab artifact for communication. Not an enforcement runtime and not a
        security boundary by itself. Pair with{" "}
        <a href="https://github.com/smfworks/refuse-card" rel="noreferrer" target="_blank">
          Refuse Card
        </a>{" "}
        for the NO / HOLD twin. Judgment stays human.
      </p>
    </section>
  );
}
