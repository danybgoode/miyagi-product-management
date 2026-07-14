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
#footer: El texto de Telegram sigue siendo la lectura canónica; este deck es el artefacto móvil.
~~~

~~~slide
@extends title-body
#title: Qué cambió
#body:
{{summary.bullets}}
#footer: Generado {{window.generatedDate}}
~~~

~~~slide
@extends title-body
#title: Repositorios
#body:
{{repos.bullets}}
#footer: GitHub REST + log incremental del standup.
~~~

~~~slide
@extends title-body
#title: Controles
#body:
- Browser smoke: **{{guards.browserSmoke}}**
- BUILD-ORDER.md: **{{guards.buildOrder}}**
- Stale previews: **{{guards.stalePreviews}}**
#footer: Las mismas señales del standup de Telegram, listas para reenviar.
~~~
