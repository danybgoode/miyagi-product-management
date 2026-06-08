---
title: "Designer collaboration portal (deferred from #4)"
slug: designer-collaboration-portal
status: raw
area: "08"
type: feature
priority: null
risk: low
epic: null
build_order: null
updated: 2026-06-08
---

Epic: Rotating Brand Collaboration & Seasonal Theme Engine

Implementation status - 2026-06-05
- Code complete on `feat/seasonal-theme-engine`.
- Sprint docs live under `Roadmap/08-growth-and-promotions/seasonal-theme-engine/`.
- Passing QA: focused touched-file lint, `npx tsc --noEmit`, `npm run build`, and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 npx playwright test e2e/platform-theme.spec.ts`.
- Open QA caveats: full `npm run lint` is blocked by existing app baseline errors outside the epic; full click-through browser smoke is pending until Playwright browser binaries or preview QA are available.

📋 Epic Overview
As a visitor or user of the main platform,
I want to seamlessly toggle between our timeless baseline experience and the latest seasonal designer collaboration theme ("Miyagi Sanchez x DesignerN"),
So that I can experience a highly curated, visually inspiring, and immersive brand presentation without experiencing layout degradation, performance lag, or accessibility loss.
🎯 Strategic Orientation & UX Heuristics
High-profile digital brand collaborations frequently fail at execution by falling into a common trap: they treat design changes like a superficial paint job. Common pain points include "Flashes of Unthemed Content" (FOUTC) on page transitions, unreadable text caused by low-contrast designer color choices, and heavy unoptimized asset downloads that tank page performance.
For the main platform experience, this theme engine must feel premium and smooth. The system should adjust instantly to the designer's aesthetic identity while remaining performant and accessible.
🧠 Theme UX Heuristics
• Zero-Flash Runtime Transitions: Toggling between the core theme and the seasonal designer theme must happen instantaneously at the presentation layer. There should be no white screens, jarring element shifts, or layout re-renders.
• Guardrails for Designer Freedom: While we want to give guest designers the flexibility to alter accents, background patterns, and spot illustrations via a JSON manifest, the platform must protect core usability. The theme engine must gracefully prevent problematic entries—such as neon accent colors that wash out text or background patterns that compete with core UI text.
• Content Preservation Over Styling: A change in theme must never alter layout structure, core navigation hierarchies, or interactive behaviors. A user looking for a specific feature must find it exactly where it was before, regardless of the active aesthetic.
🕵️‍♂️ Phase 1: Theme Audit Mandate (For the Agent)
Before drafting technical architecture or schemas, the engineering agent is strictly required to audit the existing layout implementation of the primary miyagisanchez.com repository.
🔍 Audit Objectives:
• Token Mapping: Identify all hardcoded color declarations, inline style overrides, and un-tokenized values within the global layout wrappers to ensure full conversion to a semantic variable system.
• SVG & Asset Boundaries: Evaluate how the platform logo, icons, and existing illustrations are embedded (e.g., standard image tags vs. inline SVGs) to determine the cleanest approach for live asset swapping.
• Extensibility Assessment: Review layout surface components to propose exactly where custom background patterns and localized spot illustrations can be safely introduced to maximize visual impact without cluttering user interfaces.
🛠️ Acceptance Criteria
1. Platform-Level Theme Switching (User Experience)
• AC 1.1: The primary platform must feature a high-visibility, intuitive toggle (e.g., in the header or persistent utility bar) allowing users to switch between the "Default/Core Theme" and the active "Seasonal Designer Collaboration Theme."
• AC 1.2: This choice must be scoped strictly to the global platform experience (miyagisanchez.com) and must explicitly avoid altering independent merchant/seller storefront layouts or dashboards.
• AC 1.3: The system must remember the user's theme selection across active sessions and page navigations, defaulting subsequent visits to their preferred selection.
2. Manifest Schema & System Overrides
• AC 2.1: The theme engine must ingest a standardized, isolated configuration manifest that handles the structural injection of the following dynamic properties: • --accent: Global color adjustments applied across callouts, high-impact text, and primary interactives. • logo: Alternative SVG configurations or brand treatments matching the collaboration identity. • tagline: Dynamically updated copywriting anchors matching the campaign focus. • spot_illustrations: Specific asset locations reserved for contextual artwork placements throughout the layout. • bg_pattern: Layered, performant CSS or SVG patterns applied to primary section containers.
• AC 2.2: If a specific parameter is omitted or contains malformed data within a seasonal manifest, the system must gracefully fall back to the default core theme values for that specific asset without breaking the page layout.
3. Contrast Integrity & Performance Safeguards
• AC 3.1: Dynamic accent colors provided via the manifest must be automatically parsed by the presentation layer to guarantee text readability against light or dark surface backgrounds.
• AC 3.2: All visual elements managed by the theme engine (especially background patterns and spot illustrations) must load asynchronously or utilize lightweight vectors, ensuring that activating a seasonal theme adds zero performance overhead to core metrics.
🔒 Edge Cases & Fail-safes
• Campaign Sunsetting: The system must support a clean mechanism for removing or updating a seasonal theme once a collaboration window closes, automatically reverting all active users back to the core brand presentation without manual client-side resets.
• Graceful Degradation on Slow Connections: When a user visits the platform under a heavy designer theme on a low-speed mobile connection, core textual and structural content must load first. The theme elements should layer in smoothly as background threads finish downloading.
