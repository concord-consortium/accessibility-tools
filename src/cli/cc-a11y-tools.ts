console.log(`cc-a11y-tools - @concord-consortium/accessibility-tools

Usage:
  cc-a11y-tools audit <url>    Run WCAG audit (exits non-zero on failures)
  cc-a11y-tools report <url>   Generate accessibility report (always exits 0)

Options:
  --level <A|AA|AAA>           WCAG conformance level (default: AA)
  --scope <selector>           CSS selector to scope the audit
  --output <path>              Output file path for report

Status: Not yet implemented. See roadmap Phase 2.
`);
process.exit(0);
