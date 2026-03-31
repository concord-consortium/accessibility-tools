/**
 * Live Region Inventory panel.
 *
 * Lists all aria-live regions currently in the DOM with their
 * politeness level, current text content, and component name.
 * Flags competing assertive regions, large subtrees, and
 * aria-live="off" that may suppress announcements.
 */

import { useCallback, useEffect, useState } from "react";
import { scrollToAndHighlight } from "../utils";
import type { LiveRegionInfo } from "../utils/live-region-observer";
import {
  getLiveRegions,
  subscribeAnnouncements,
} from "../utils/live-region-observer";

interface RegionEntry extends LiveRegionInfo {
  text: string;
  childCount: number;
  hasIssue: boolean;
  issueReason: string | null;
}

function analyzeRegion(info: LiveRegionInfo): RegionEntry {
  const text = (info.element.textContent ?? "").trim();
  const childCount = info.element.querySelectorAll("*").length;
  let hasIssue = false;
  let issueReason: string | null = null;

  if (childCount > 50) {
    hasIssue = true;
    issueReason = `Large subtree (${childCount} descendants) - performance risk`;
  } else if (info.politeness === "off") {
    hasIssue = true;
    issueReason = 'aria-live="off" may suppress announcements';
  }

  return {
    ...info,
    text,
    childCount,
    hasIssue,
    issueReason,
  };
}

export function LiveRegionsPanel() {
  const [regions, setRegions] = useState<RegionEntry[]>([]);
  const [, forceUpdate] = useState(0);

  const rescan = useCallback(() => {
    const infos = getLiveRegions();
    const entries = infos.map(analyzeRegion);

    // Flag competing assertive regions
    const assertiveCount = entries.filter(
      (r) => r.politeness === "assertive",
    ).length;
    if (assertiveCount > 1) {
      for (const entry of entries) {
        if (entry.politeness === "assertive" && !entry.hasIssue) {
          entry.hasIssue = true;
          entry.issueReason = `Competing assertive region (${assertiveCount} total) - may interrupt each other`;
        }
      }
    }

    setRegions(entries);
  }, []);

  useEffect(() => {
    rescan();

    // Re-scan when announcements fire (content changed)
    const unsubscribe = subscribeAnnouncements(() => {
      rescan();
    });

    return unsubscribe;
  }, [rescan]);

  const issueCount = regions.filter((r) => r.hasIssue).length;

  return (
    <div className="a11y-panel-content">
      <h3 className="a11y-panel-title">Live Region Inventory</h3>
      <div className="a11y-panel-toolbar">
        <button type="button" onClick={rescan} className="a11y-panel-btn">
          Rescan
        </button>
        <span className="a11y-panel-count">
          {regions.length} region{regions.length !== 1 ? "s" : ""}
          {issueCount > 0 &&
            `, ${issueCount} issue${issueCount !== 1 ? "s" : ""}`}
        </span>
      </div>

      {issueCount > 0 && (
        <div className="a11y-panel-issues">
          {regions
            .filter((r) => r.hasIssue)
            .map((r, i) => (
              <div key={`issue-${i}`} className="a11y-panel-issue">
                {r.issueReason}
              </div>
            ))}
        </div>
      )}

      {regions.length === 0 ? (
        <div className="a11y-focus-empty">
          No aria-live regions found in the DOM. Live regions are used to
          announce dynamic content changes to screen readers.
        </div>
      ) : (
        <div className="a11y-panel-list">
          {regions.map((region, i) => (
            <button
              type="button"
              key={`lr-${i}`}
              className={`a11y-panel-row a11y-panel-row-clickable ${region.hasIssue ? "a11y-panel-row-error" : ""}`}
              aria-label={`${region.politeness} live region: ${region.text || "(empty)"} in ${region.description}`}
              title={`${region.description}\n${region.politeness}\n${region.text || "(empty)"}${region.issueReason ? `\n${region.issueReason}` : ""}`}
              onClick={() => {
                if (document.contains(region.element)) {
                  scrollToAndHighlight(region.element, {
                    color:
                      region.politeness === "assertive"
                        ? "#f97316"
                        : region.politeness === "off"
                          ? "#9ca3af"
                          : "#2563eb",
                  });
                  forceUpdate((n) => n + 1);
                }
              }}
            >
              <span
                className={`a11y-live-badge a11y-live-badge-${region.politeness}`}
              >
                {region.politeness}
              </span>
              <span className="a11y-panel-text">
                {region.text || (
                  <span className="a11y-announcement-cleared">(empty)</span>
                )}
              </span>
              {region.componentName && (
                <span className="a11y-panel-component">
                  {region.componentName}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
