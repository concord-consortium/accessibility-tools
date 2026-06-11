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
  /** Static landing-hint text; shown when the library sets data-landing. */
  hint: string;
  /** Host owns the iframe's tabindex (enterable when undefined). */
  iframeTabIndex?: number;
}

// The library is the sole imperative writer of tabindex/data-landing on the
// sentinels; we only provide the ref + key and style. The hint is revealed by
// the [data-landing] attribute the library sets, via the sibling-span CSS below.
const sentinelStyle = {
  display: "inline-block",
  minWidth: 4,
  minHeight: 16,
} as const;

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
        style={sentinelStyle}
      />
      <span className="sentinel-hint">{hint}</span>
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
        style={sentinelStyle}
      />
    </div>
  );
}
