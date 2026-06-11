import type { RefObject } from "react";

export interface SentinelIframeProps {
  /** Wrapper element used as the slot element in getElements. */
  wrapperRef: RefObject<HTMLDivElement | null>;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  beforeSentinelProps: { ref: RefObject<HTMLElement | null>; key: string };
  afterSentinelProps: { ref: RefObject<HTMLElement | null>; key: string };
  /** Cross-origin URL from crossOriginInnerSrc(). */
  src: string;
  title: string;
  /**
   * Landing hint text. It lives INSIDE each sentinel; the sentinel collapses to
   * zero size and reveals this text only while the library marks it with
   * data-landing (see the .iframe-sentinel CSS).
   */
  hint: string;
  /** Host owns the iframe's tabindex (enterable when undefined). */
  iframeTabIndex?: number;
}

// The library is the sole imperative writer of tabindex/data-landing on the
// sentinels; we only provide the ref + key, the className, and the hint text.
export function SentinelIframe({
  wrapperRef,
  iframeRef,
  beforeSentinelProps,
  afterSentinelProps,
  src,
  title,
  hint,
  iframeTabIndex,
}: SentinelIframeProps) {
  return (
    <div
      ref={wrapperRef as RefObject<HTMLDivElement>}
      style={{ border: "2px dashed #94a3b8", borderRadius: 4, padding: 8 }}
    >
      <span
        ref={beforeSentinelProps.ref as RefObject<HTMLSpanElement>}
        key={beforeSentinelProps.key}
        data-testid={`${title}-before-sentinel`}
        className="iframe-sentinel"
      >
        {hint}
      </span>
      <iframe
        ref={iframeRef as RefObject<HTMLIFrameElement>}
        src={src}
        title={title}
        tabIndex={iframeTabIndex}
        data-testid={`${title}-iframe`}
        style={{
          display: "block",
          width: "100%",
          height: 140,
          border: "1px solid #cbd5e1",
          margin: "4px 0",
        }}
      />
      <span
        ref={afterSentinelProps.ref as RefObject<HTMLSpanElement>}
        key={afterSentinelProps.key}
        data-testid={`${title}-after-sentinel`}
        className="iframe-sentinel"
      >
        {hint}
      </span>
    </div>
  );
}
