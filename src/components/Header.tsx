export function Header() {
  return (
    <header className="mast">
      <div className="mast-brand">
        <span className="mark" aria-hidden="true" />
        <div>
          <p className="eyebrow">SMF Works · Human-AI lab</p>
          <h1>Tool Permit</h1>
        </div>
      </div>
      <p className="lede">
        Declare which tools an agent may use. Print a GO / allowlist badge. Share
        the permit — not a security boundary.
      </p>
    </header>
  );
}
