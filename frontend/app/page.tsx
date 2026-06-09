import Link from "next/link";

const FEATURES = [
  ["01", "Typed Request", "Validated market IDs, slugs, and custom market text enter the pipeline cleanly."],
  ["02", "Ranked Sources", "Evidence URLs are sorted for resolution relevance before they reach the workbench."],
  ["03", "Live API", "The browser calls the same-origin recommendation endpoint with no ranking logic bundled here."],
];

const COLOR_SQUARES = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];

function WindowPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`retro-window ${className}`}>
      <div className="retro-titlebar">
        <span>{title}</span>
        <span aria-hidden="true" className="retro-window-controls">
          <span />
          <span />
          <span />
        </span>
      </div>
      <div className="retro-window-body">{children}</div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <nav className="retro-nav" aria-label="Primary navigation">
        <Link href="/" className="retro-brand">
          po1market
        </Link>
        <div className="retro-nav-links">
          <a href="#intro">Intro</a>
          <Link href="/dashboard">Workbench</Link>
          <a href="#api">API</a>
          <a href="#faq">FAQ</a>
        </div>
      </nav>

      <div className="retro-marquee" aria-label="Announcement ticker">
        <div className="retro-marquee-track">
          <span>*** HOT! Live market source finder now on the information superhighway ***</span>
          <span>Typed queries! Ranked URLs! Zero browser-side scoring!</span>
          <span>Best viewed at 800x600 with maximum optimism!</span>
          <span>*** HOT! Live market source finder now on the information superhighway ***</span>
        </div>
      </div>

      <main className="retro-page">
        <section id="intro" className="retro-hero" aria-labelledby="hero-title">
          <WindowPanel title="po1market.exe">
            <div className="retro-hero-grid">
              <div>
                <p className="retro-kicker">
                  <span className="retro-badge">HOT!</span> market evidence terminal
                </p>
                <h1 id="hero-title">
                  <span className="rainbow-text">Find Signal</span>
                  <br />
                  Before the Market Moves
                </h1>
                <p className="retro-copy">
                  Type a Polymarket question, get ranked evidence URLs, and inspect the result in
                  a console that finally looks like it shipped on a CD-ROM.
                </p>
                <div className="retro-actions">
                  <Link href="/dashboard" className="retro-button retro-button-primary">
                    Open workbench
                  </Link>
                  <a href="#features" className="retro-button">
                    View features
                  </a>
                </div>
              </div>

              <aside className="retro-status-box" aria-label="Site statistics">
                <p>Visitors: 0001997 | Since 1995</p>
                <p>MODE: ONLINE</p>
                <p>PIPELINE: READY</p>
              </aside>
            </div>
          </WindowPanel>
        </section>

        <hr className="hr-groove" />

        <section id="features" className="retro-section" aria-labelledby="features-title">
          <WindowPanel title="FEATURES.TBL">
            <div className="retro-section-heading">
              <p>[ FEATURES ]</p>
              <h2 id="features-title">How it works</h2>
            </div>
            <div className="retro-table" role="table" aria-label="Feature list">
              {FEATURES.map(([number, title, description]) => (
                <div className="retro-row" role="row" key={title}>
                  <span role="cell" className="retro-cell retro-number">
                    {number}
                  </span>
                  <span role="cell" className="retro-cell retro-feature-title">
                    {title}
                  </span>
                  <span role="cell" className="retro-cell">
                    {description}
                  </span>
                </div>
              ))}
            </div>
          </WindowPanel>
        </section>

        <section className="retro-section" aria-label="decorative 90s color squares">
          <div className="retro-color-grid">
            {COLOR_SQUARES.map((color) => (
              <span key={color} style={{ backgroundColor: color }} aria-hidden="true" />
            ))}
          </div>
        </section>

        <hr className="hr-groove" />

        <section id="api" className="retro-section" aria-labelledby="api-title">
          <WindowPanel title="API_HELP.HLP">
            <div className="retro-section-heading">
              <p>[ API ]</p>
              <h2 id="api-title">Endpoint</h2>
            </div>
            <code className="retro-code">POST /api/v1/recommendations</code>
            <p className="retro-copy">
              The Next app serializes the form, calls the endpoint from the browser, and renders
              JSON response rows. The frontend is only the proof surface.
            </p>
          </WindowPanel>
        </section>

        <section id="faq" className="retro-section" aria-labelledby="faq-title">
          <WindowPanel title="QUESTIONS.FAQ">
            <div className="retro-section-heading">
              <p>[ FAQ ]</p>
              <h2 id="faq-title">Questions</h2>
            </div>
            <div className="retro-faq-grid">
              <article>
                <h3>Live data or mock?</h3>
                <p>
                  Live API responses when the backend is connected. Empty and error states mean the
                  service is unreachable or returned nothing for that query.
                </p>
              </article>
              <article>
                <h3>Where is the console?</h3>
                <p>
                  Open <Link href="/dashboard">/dashboard</Link> for the full workbench.
                </p>
              </article>
            </div>
          </WindowPanel>
        </section>

        <section className="retro-construction">
          <div>
            <strong>Under Construction</strong>
            <span>New source providers and ranking diagnostics are being bolted on.</span>
          </div>
          <Link href="/dashboard" className="retro-button retro-button-danger">
            Enter site
          </Link>
        </section>
      </main>
    </>
  );
}
