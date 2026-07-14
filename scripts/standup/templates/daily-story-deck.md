---
title: "Standup diario - {{window.date}}"
styles:
  fontFamily: "Inter"
  baseFontSize: 15
  lineHeight: 1.55
  slideAspectRatio: "{{deck.aspectRatio}}"
  h1: { fontSize: 2.0, fontWeight: 700 }
  h2: { fontSize: 1.25, fontWeight: 600 }
---

# Standup diario - {{window.date}}

~~~slide
@extends cover
#title: Standup diario
#subtitle: {{window.date}}
#kicker: Miyagi ops-nightly
#footer: Plain Telegram text remains canonical; this deck is the mobile artifact.
~~~

~~~slide
@extends title-body
#title: Que cambio
#body:
{{summary.bullets}}
#footer: Generado {{window.generatedDate}}
~~~

~~~slide
@extends title-body
#title: Repos
#body:
{{repos.bullets}}
#footer: GitHub REST + existing standup delta log.
~~~

~~~slide
@extends title-body
#title: Guardrails
#body:
- Browser smoke: **{{guards.browserSmoke}}**
- BUILD-ORDER.md: **{{guards.buildOrder}}**
- Stale previews: **{{guards.stalePreviews}}**
#footer: Same signals as the Telegram standup, rendered for forwarding.
~~~
