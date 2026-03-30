import { useState } from "react";

export function FocusLossSection() {
  const [showButton, setShowButton] = useState(true);
  const [isDisabled, setIsDisabled] = useState(false);

  return (
    <section>
      <h2>Focus Loss</h2>

      <h3 className="bad">
        Bad: Button removes itself from DOM on click (focus falls to body)
      </h3>
      {showButton ? (
        <button type="button" onClick={() => setShowButton(false)}>
          Click me - I will disappear (focus lost!)
        </button>
      ) : (
        <p>
          Button removed. Focus fell to document.body.{" "}
          <button type="button" onClick={() => setShowButton(true)}>
            Reset
          </button>
        </p>
      )}

      <h3 className="bad">Bad: Element disables itself on click</h3>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setIsDisabled(true)}
      >
        {isDisabled
          ? "Disabled (focus lost!)"
          : "Click me - I will disable myself"}
      </button>
      {isDisabled && (
        <>
          {" "}
          <button type="button" onClick={() => setIsDisabled(false)}>
            Reset
          </button>
        </>
      )}
    </section>
  );
}
