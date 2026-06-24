import { describe, expect, it, vi } from "vitest";
import type { FocusMessage, FocusTransport } from "./focus-messages";

describe("FocusMessage vocabulary", () => {
  it("accepts every defined message shape", () => {
    const messages: FocusMessage[] = [
      { type: "focusEnter", mode: "forward" },
      { type: "focusEnter", mode: "reverse" },
      { type: "focusEnter", mode: "restore" },
      { type: "focusExit", mode: "forward" },
      { type: "focusExit", mode: "reverse" },
      { type: "focusExit", mode: "escape" },
      { type: "trapStateChanged", active: true },
      { type: "focusReady" },
      { type: "capability", focusProtocol: true },
    ];
    expect(messages).toHaveLength(9);
  });

  it("FocusTransport.send/onMessage round-trips a message", () => {
    const subscribers: Array<(m: FocusMessage) => void> = [];
    const transport: FocusTransport = {
      send: vi.fn(),
      onMessage: (cb) => {
        subscribers.push(cb);
        return () => {
          const i = subscribers.indexOf(cb);
          if (i >= 0) subscribers.splice(i, 1);
        };
      },
    };

    const received: FocusMessage[] = [];
    const unsub = transport.onMessage((m) => received.push(m));
    for (const cb of subscribers) cb({ type: "focusExit", mode: "escape" });
    expect(received).toEqual([{ type: "focusExit", mode: "escape" }]);

    unsub();
    for (const cb of subscribers) cb({ type: "focusReady" });
    expect(received).toHaveLength(1);
  });
});
