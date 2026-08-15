# Sprint 1 — Press + pending feedback foundation

**Status:** 🟦 In review · PR [#374](https://github.com/danybgoode/miyagisanchezcommerce/pull/374), [#375](https://github.com/danybgoode/miyagisanchezcommerce/pull/375)

## Story 1.1 — every clickable thing acknowledges the click

> **As a** buyer on a phone, **I want** the thing I tap to visibly react, **so that** I know my tap
> landed and do not tap again.
>
> **Acceptance:** press and hold a product tile on `/mx` — it dims and shrinks slightly, and springs
> back on release. Works on a touch screen, where there is no hover to stand in for it.

Shipped as one `globals.css` block covering `.card-tile`, `.chip`, `.cat-row` and an opt-in
`.pressable`, plus `-webkit-tap-highlight-color: transparent` — removed only because it is being
*replaced*, never on its own.

`.card-tile:active` has to visibly **undo** the hover lift, or a mouse user sees the two cancel out.

Reduced motion keeps the brightness change and drops the movement: a reduced-motion user still needs
to know the tap registered.

## Story 1.2 — the thing I clicked shows it is loading

> **As a** merchant clicking a `/shop/manage` nav item, **I want** that item to change state and show
> a subtle loader, **so that** I know which of the fifteen entries is the one that is working.
>
> **Acceptance:** click "Pedidos" — it dims, a small dot appears next to it, and a thin bar runs
> along the top of the screen. Both clear on arrival; nothing stays dimmed.

`PendingMark` is the ONE implementation of the ancestor-flag write (`data-pending` has to land on the
`<a>` while only a descendant can read the status). A second hand-rolled copy at a call site is how
the cleanup gets forgotten, and a forgotten cleanup leaves a link permanently dimmed and stuck on
`cursor: progress` — a "still loading" claim about a navigation that finished.

## Story 1.3 — the app tells me it is going somewhere <a id="s2"></a>

> **As** anyone, **I want** a global signal that a navigation is underway, **so that** a slow route
> does not read as a dead click.
>
> **Acceptance:** on a slow connection, a 2px accent bar appears at the top and completes on arrival.
> On a fast/prefetched route it never appears at all.

## Story 1.4 — a button I pressed does not just go inert

> **As** anyone submitting a form, **I want** the button to show it is working, **so that** I do not
> press it twice.
>
> **Acceptance:** saving a settings section shows the dot on the button and the button stops
> accepting a second press.

`loading` is deliberately NOT the same prop as `disabled`: a disabled button is one you may not
press, a loading button is one you already pressed. ~20 call sites adopted it (PR #375).

## Verified

Run in a real browser against `next dev`:

| check | result |
|---|---|
| hover transform | `translateY(-1px)` |
| pressed transform | `scale(0.985)` |
| `data-pending` on the clicked link | present |
| progress bar width, 1.5s-throttled nav | 16% |
| both after arrival | cleared |

**Red-then-green:** press CSS deleted → press spec red. `data-pending` write disabled → pending spec
red. Both restored → green.

## Two defects the specs found that review did not

1. `shouldStartNavProgress` resolved hrefs against the bare **origin**, so `#seccion` on `/mx`
   resolved to `/` and started the bar for a scroll.
2. The press browser-spec baselined on the **resting** transform, so it passed on hover alone and
   stayed green through a mutation deleting the entire `.card-tile:active` rule. It was measuring
   hover and calling it press.
