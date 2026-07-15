This new report provides the precise technical diagnostic data needed to optimize the site. While the **Accessibility, Best Practices, and SEO scores remain a flawless 100/100**, the **Performance score is at 65**.

The primary critical path bottleneck is a severe **Largest Contentful Paint (LCP) delay of 12.2 seconds**, alongside **3.9 MB of uncompressed network payloads** and **render-blocking stylesheets**.

---

# Epic: Performance Optimization & Core Web Vitals Remediation

**Epic Description:**

The purpose of this Epic is to resolve the high visual load latency on `miyagisanchez.com` by aggressively addressing asset pipeline optimization, browser caching strategy, and render-blocking resources. The primary target is reducing the 12.2s LCP down to the <2.5s threshold.

**Epic Acceptance Criteria:**

* Mobile Performance Score increases from 65 to $\ge$ 90.


* Largest Contentful Paint (LCP) drops below 2.5 seconds (currently 12.2s).


* Total network payload size falls below 1.5 MB (currently ~3.9 MB).



---

## User Stories & Technical Breakdowns

### Story 1: Optimize Cloudflare R2 Image Pipeline and Implement Browser Caching

**As a** developer,

**I want to** programmatically transform, resize, and aggressively cache storage assets

**So that** users don't download multi-megabyte raw source files over mobile connections.

* **The Problem:** The app is fetching uncompressed source images directly from Cloudflare R2 (`pub-...r2.dev`) with a `Cache TTL` set to `None`. Single assets like *"Haz churros y chocolate caliente..."* are 912 KiB (displayed at 321x428 but loading a massive 1200x1195 canvas).


* **Technical Tasks:**
* Configure global `Cache-Control` metadata headers on the Cloudflare R2 bucket objects (e.g., `public, max-age=31536000, immutable`) to fix the `None` TTL flag.


* Integrate an on-the-fly image optimization mechanism (such as Cloudflare Images, a custom worker transformation, or a build-time script) to convert raw JPEGs to modern formats (**Next-Gen AVIF/WebP**).


* Implement responsive `srcset` definitions on image components to serve appropriate layout dimensions rather than raw 1200px or 1600px sources for standard mobile cards.




* **Acceptance Criteria:**
* All R2 asset responses return an explicit long-lived browser cache header.


* Total image payload delivery size scales down by an estimated ~2.6 MB.





---

### Story 2: Refactor Render-Blocking Fonts & CSS Framework Bloat

**As a** user,

**I want** the browser window to start painting layout instantly

**So that** I do not stare at a blank white screen for 2.5+ seconds on a 4G connection.

* **The Problem:** Loading the entire `iconoir.css` icon library from a public JSDelivr CDN blocks the critical rendering path for **2,580 ms**. Out of 202.8 KiB transferred, **200.2 KiB is completely unused CSS rules**.


* **Technical Tasks:**
* Remove the blanket global JSDelivr CDN link for `iconoir.css` from the document head.


* Extract and inline only the specific SVG icons used across the active UI components, or switch to an icon package that supports build-time tree-shaking.
* Optimize the Google Font stylesheet request (`Space Grotesk`) by adding a `font-display: swap` strategy if not fully applied, minimizing font-render blocking.




* **Acceptance Criteria:**
* Lighthouse reports zero critical render-blocking requests originating from external icon CDNs.


* Estimated savings of ~1,320 ms in initial render delay.





---

### Story 3: Optimize LCP Element Render Path (`Flashback (original)`)

**As a** user,

**I want** the primary hero banner image to load with the highest networking priority

**So that** the main visual segment of the page completes rendering immediately.

* **The Problem:** The current LCP target element is identified as the image component `<img alt="Flashback (original)">`. It experiences a severe **710 ms element render delay** and a **560 ms resource load delay**.


* **Technical Tasks:**
* Audit the DOM code to ensure that the `Flashback (original)` image element **does not** contain `loading="lazy"` attribute tags, which artificially depress mobile download priority.


* Explicitly append the attribute `fetchpriority="high"` directly onto this primary image element.


* Add a header level `<link rel="preload" as="image" href="...">` pointing directly to this localized asset URL to instruct the parser to discover the resource instantly.




* **Acceptance Criteria:**
* Resource load delay drops close to 0 ms.


* The browser begins fetching the LCP image file concurrently alongside the initial HTML document streaming.





---

### Story 4: Bundle Tree-Shaking & Defer Clerk Auth Bundles

**As a** developer,

**I want to** break down major application script files and isolate client authentication layers

**So that** the browser main thread avoids costly long-execution blocking tasks during boots.

* **The Problem:** Client-side runtime execution is bloated by ~378 KiB of unused JavaScript. Multiple large authentication sub-bundles originating from `clerk.miyagisanchez.com` (`clerk.browser.js`, `ui.browser.js`, `vendors_ui`) parse synchronously, triggering long main-thread processing executions up to **85 ms**.


* **Technical Tasks:**
* Analyze first-party compilation layouts (specifically targeting `chunks/07si13y85o5~u.js`) to target and purge legacy array/string polyfills that modern mobile browsers support out of the box.


* Implement code-splitting or dynamic lazy-loading hooks for individual Clerk auth wrappers (such as profile components or sign-in buttons) so they only load when triggered by explicit user interaction.


* **Acceptance Criteria:**
* Lighthouse diagnostics register zero main-thread scripting tasks breaking the strict 50 ms long-task boundary threshold.