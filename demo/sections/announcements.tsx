import { useState } from "react";

export function AnnouncementsSection() {
  const [politeMsg, setPoliteMsg] = useState("");
  const [assertiveMsg, setAssertiveMsg] = useState("");
  const [counter, setCounter] = useState(0);

  return (
    <section>
      <h2>Announcements (aria-live)</h2>

      <h3 className="good">Good: Polite live region</h3>
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ padding: 4, minHeight: 24, border: "1px solid #ccc" }}
      >
        {politeMsg}
      </div>
      <button
        type="button"
        onClick={() =>
          setPoliteMsg(`Polite update at ${new Date().toLocaleTimeString()}`)
        }
      >
        Trigger polite announcement
      </button>

      <h3 className="good">Good: Assertive live region</h3>
      <div
        aria-live="assertive"
        role="alert"
        style={{ padding: 4, minHeight: 24, border: "1px solid #dc2626" }}
      >
        {assertiveMsg}
      </div>
      <button
        type="button"
        onClick={() =>
          setAssertiveMsg(`URGENT: Assertive update #${counter + 1}`)
        }
      >
        Trigger assertive announcement
      </button>

      <h3 className="bad">Bad: Competing assertive regions</h3>
      <div
        aria-live="assertive"
        style={{ padding: 4, border: "1px solid orange" }}
      >
        Region A: {counter > 0 ? `Update A-${counter}` : ""}
      </div>
      <div
        aria-live="assertive"
        style={{ padding: 4, border: "1px solid orange" }}
      >
        Region B: {counter > 0 ? `Update B-${counter}` : ""}
      </div>
      <button type="button" onClick={() => setCounter((c) => c + 1)}>
        Update both assertive regions simultaneously
      </button>
    </section>
  );
}
