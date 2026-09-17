import type { ToolPermit } from "../types";
import { expiryLabel, formatExpiry } from "../lib/permit";
import { formatStampTime } from "../lib/share";

interface PermitCardProps {
  permit: ToolPermit | null;
}

function barcodeBars(id: string): number[] {
  const bars: number[] = [];
  for (let i = 0; i < 36; i += 1) {
    const code = id.charCodeAt(i % id.length) + i * 17;
    bars.push(1 + (code % 4));
  }
  return bars;
}

export function PermitCard({ permit }: PermitCardProps) {
  const ready = Boolean(permit?.agent && permit.allowed.length);
  const tone = ready ? "is-go" : "is-empty";

  return (
    <article className={`ticket ${tone}`}>
      <div className="ticket-rail" aria-hidden="true" />
      <header className="ticket-head">
        <div>
          <p className="r-kicker">Allowlist badge</p>
          <h2>Tool Permit</h2>
        </div>
        <p className="ticket-seq">{permit?.id ?? "TP-————"}</p>
      </header>

      <div className="perf" aria-hidden="true">
        <span />
      </div>

      <div className="ticket-body">
        <div className="stamp-row">
          <div className={`wax ${tone}`}>
            <div className="wax-ring" />
            <div className="wax-core">
              <span className="wax-kicker">SMF WORKS</span>
              <strong>{ready ? "GO" : "AWAIT"}</strong>
              <span className="wax-sub">{ready ? "ALLOWLIST" : "DECLARE TOOLS"}</span>
            </div>
          </div>
          <dl className="codes">
            <div>
              <dt>Stamp</dt>
              <dd>{ready ? "PERMIT" : "—"}</dd>
            </div>
            <div>
              <dt>Expiry</dt>
              <dd>{permit ? formatExpiry(permit.expiry) : "—"}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>GO-LIST</dd>
            </div>
          </dl>
        </div>

        <section className="r-hero">
          <p className="r-label">Issued for</p>
          <h3>{permit?.agent || "Name the agent or project."}</h3>
          {permit?.project ? <p className="r-project">{permit.project}</p> : null}
        </section>

        <section className="r-block">
          <p className="r-label">Scope</p>
          <p className={permit?.scope ? "scope-line" : "r-placeholder"}>
            {permit?.scope || "One line: what this permit actually covers."}
          </p>
        </section>

        <section className="r-block">
          <p className="r-label">Allowed tools</p>
          {permit && permit.allowed.length ? (
            <ul className="tool-chips">
              {permit.allowed.map((tool) => (
                <li key={tool} className="tool-chip is-go">
                  {tool}
                </li>
              ))}
            </ul>
          ) : (
            <p className="r-placeholder">Tap tools on the left to fill the GO-list.</p>
          )}
        </section>

        {permit && permit.denied.length ? (
          <section className="r-block">
            <p className="r-label is-deny">Explicitly denied</p>
            <ul className="tool-chips">
              {permit.denied.map((tool) => (
                <li key={tool} className="tool-chip is-no">
                  {tool}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="coupon">
          <p className="r-label">Window</p>
          <p className="coupon-line">
            {permit ? expiryLabel(permit.expiry) : "Session or a calendar date."}
          </p>
        </section>
      </div>

      <div className="perf" aria-hidden="true">
        <span />
      </div>

      <div className="barcode" aria-hidden="true">
        {barcodeBars(permit?.id ?? "TP-0000").map((width, index) => (
          <i key={index} style={{ width }} />
        ))}
      </div>

      <footer className="r-foot">
        <p>SMF Works · Tool Permit</p>
        <p className="r-link">smfworks.com</p>
        <p className="r-motto">
          {permit ? formatStampTime(permit.issuedAt) : "Lab artifact · not a runtime"}
        </p>
        <p className="r-motto">Not a security boundary by itself.</p>
      </footer>
    </article>
  );
}
