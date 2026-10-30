"use client";

// Never shows the real error: just a friendly message and a way back.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap page">
      <h1>The fire&rsquo;s gone out</h1>
      <p className="lede">Something went wrong on our end. Give it another go, and if it keeps happening, let us know.</p>
      <p style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button className="btn" type="button" onClick={reset}>Try again</button>
        <a className="btn btn-coal" href="/">Back home</a>
      </p>
    </div>
  );
}
