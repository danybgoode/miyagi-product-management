# Sprint 3 — contact address, emoji round 2, the checklist

**Status:** 🟦 In review · PR [#377](https://github.com/danybgoode/miyagisanchezcommerce/pull/377)

## Story 3.1 — there is a way to reach a human

> **As** anyone with a question, **I want** to find an email address, **so that** I can ask it.
>
> **Acceptance:** `hola@miyagisanchez.com` is reachable from the site footer, the 404 page,
> `/terminos` and `/acerca`.

It existed only as `REPLY_TO` inside `lib/email.ts`, so the only way to reach a person was to reply
to an email we had already sent — which a visitor with a question has never received.

`/acerca` also publishes it as `Organization.email` in the JSON-LD. This platform is UCP-native; an
agent asking how to reach the marketplace should not have to scrape a footer.

The white-label footer deliberately does **not** carry it (D8), and a spec asserts the omission.

**Still owed:** Clerk sends the sign-up verification emails from its own dashboard templates. Those
are not in this repo and need Daniel to add the address there.

## Story 3.2 — the emoji guard can see its own files

> **As** the team, **I want** the guard to actually catch emoji in the files it claims to enforce.
>
> **Acceptance:** `analytics/AnalyticsClient.tsx` has no emoji, and a fixture proves the newly-covered
> Unicode blocks are caught.

`analytics/AnalyticsClient.tsx` was in `enforcedSweptPaths` since the sweep shipped and carried 🆕 and
⏳ the whole time, **green**. The file list was right; the *detector* had the hole — so widening the
list would never have found it. Widening the pattern immediately found 4 offenders in already-enforced
files.

⌘ ⌥ ⌫ ⏎ stay legal: same Unicode block as ⏳, real text in a shortcut hint. A guard that rejects
correct output gets bypassed rather than fixed.

**Premise corrected mid-build:** two more files were converted and were about to be added to the
enforced set; the widened pattern then showed both still carry pass-2 emoji in TS label configs.
Additions backed out, conversions kept, reasoning left in the file.

## Story 3.3 — the market selector drops its flag emoji

> **As** a visitor on the root page, **I want** a market marker that renders the same everywhere.
>
> **Acceptance:** `MX` and `US` chips, no flags.

🇲🇽 renders as a coloured flag on Apple, a two-letter box on most of Windows, and nothing where the
font lacks the pair. And a national flag stands in for a **market**, not a country — `/us` is where
USD listings and manual-carrier delivery live.

## Story 3.4 — every checklist step is actionable

> **As** a new merchant, **I want** to act on any unfinished step, **so that** the checklist is a tool
> rather than a status display.
>
> **Acceptance:** "Comparte tu tienda" has a link. So does every other unfinished step.

Only the *open* step rendered a CTA, so four of five rows were inert. Daniel hit it on "Comparte tu
tienda" because that step sits last and is therefore open least often — but the same was true of any
step that was not the current one.

"Activa cómo cobrar" also moved from `/settings/pagos/wizard` to the section. The wizard is one
guided path through a section that also shows what is **already connected**; a merchant dropped
straight into it could not see the state they were being asked to change. *(Route verified in use,
not assumed: the Mercado Pago OAuth callback already redirects merchants there.)*
