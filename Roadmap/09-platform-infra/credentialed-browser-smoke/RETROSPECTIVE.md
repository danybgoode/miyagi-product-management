# Retrospective — Credentialed browser smoke

_Closed: 2026-07-26_

## What shipped

One sprint, one commit (`7928e1a`), built by a delegated Codex subagent.

- `MS_TEST_BROWSER_AUTH=1` on the **preview-targeted** path only; the anonymous production nightly is
  unchanged.
- `authEnabled()` now also requires the dev Clerk keys, so a half-provisioned CI **skips** instead of
  failing at sign-in.
- A Playwright reporter records which authed specs skipped and which fixture each was missing, to the
  GitHub job summary and to JSON. **Names only, never values** — verified: no environment value is
  interpolated anywhere in the reporter or the summary script.
- The fixture inventory is derived from the spec tree, and the `*_PASSWORD` secrets are removed as
  vestigial.

## What went well

**The half we could own, we owned.** Clerk rejects its testing token for production secret keys by
design, so this epic structurally cannot close its own gap. Naming that up front let the sprint aim at
the part that does not depend on anyone provisioning anything: **making silent skips visible**. A green
tick over dozens of skipped specs was the more dangerous half anyway.

**The precedent justified the design.** `MS_TEST_GALLERY_LISTING_ID` existed as a secret from
2026-06-10 but was never wired into the job env, so its smoke silently skipped for over a month. That
is why the fixture list is generated from the spec tree rather than copied from the workflow comment
block that had already drifted.

**Delegation to a different model family worked, with verification.** The subagent reported plainly
that it could not run Playwright locally and therefore had not observed a real no-secret run — an
honest gap rather than an implied pass.

## What we learned

**Never convert a skip into a failure.** An unprovisioned secret is not a broken product; making the
nightly permanently red would train everyone to ignore it, which is the opposite of the goal. Report
loudly, fail nothing.

**Ceremony nobody needs is its own cost.** Sign-in is ticket-based and needs only an email plus
`CLERK_SECRET_KEY`. Independently confirmed no spec or helper reads either `*_PASSWORD` secret — so two
of the nine fixtures Daniel was asked to provision were never needed.

## Gaps / follow-ups

- **Owed to Daniel — the terminating dependency:** dev-instance Clerk test users and the repo secrets
  in the generated inventory. Until then the specs skip — but now **visibly and countably**.
- **The skip count is static, not observed.** 23 credentialed declarations counted by inspection; a
  live run with no secrets set has not happened. That is the acceptance criterion still open.
- Cross-agent review + fresh `pr-reviewer` owed (MED tier).
