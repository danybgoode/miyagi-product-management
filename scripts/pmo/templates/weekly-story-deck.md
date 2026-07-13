---
title: "PMO semanal - {{window.label}}"
styles:
  fontFamily: "Inter"
  baseFontSize: 15
  lineHeight: 1.6
  h1: { fontSize: 2.1, fontWeight: 700 }
  h2: { fontSize: 1.35, fontWeight: 600 }
---

# PMO semanal - {{window.label}}

Linea honesta: esto muestra un diferencial operativo frente a referencias externas; no es un experimento controlado.

~~~slide
@extends cover
#title: PMO semanal
#subtitle: {{window.label}}
#kicker: Miyagi - reporte operativo
#footer: Generado desde git, GitHub REST y Roadmap
~~~

~~~slide
@extends metric
#title: Flujo de entrega
#metric: {{throughput.shippedStories}}
#label: historias shipped
#caption: {{throughput.shippedEpics}} epics shipped - {{deploys.total}} deploys por merge a main
~~~

~~~slide
@extends exhibit
#title: Cadencia y calidad
#chart:
  ```chart
  {"type":"bar","title":"Senales PMO","labels":["Historias","Epics","Deploys","Reverts/hotfix"],"values":[{{throughput.shippedStories}},{{throughput.shippedEpics}},{{deploys.total}},{{quality.changeFailProxy}}],"color":"#2563eb"}
  ```
#takeaway:
  Ciclo PR mediano: **{{cycle.medianHours}}h**.

  Lead time epic mediano: **{{epics.medianDays}} dias**.
#source: Datos internos, {{window.generatedDate}}.
~~~

~~~slide
@extends title-body
#title: Operacion documental
#body:
  ```chart
  {"type":"bar","title":"Doc-ops","labels":["LEARNINGS","Retros cubiertas"],"values":[{{docOps.learningsPromotions}},{{docOps.retroCovered}}],"color":"#0f766e"}
  ```
#footer: Retro coverage {{docOps.retroCovered}}/{{docOps.retroTotal}}.
~~~

~~~slide
@extends title-body
#title: Lectura ejecutiva
#body:
- Throughput: **{{throughput.shippedStories}}** historias y **{{throughput.shippedEpics}}** epics shipped.
- Deploy frequency: **{{deploys.total}}** merges a main.
- Change-fail proxy: **{{quality.changeFailProxy}}** reverts/hotfixes.
- Doc-ops: **{{docOps.learningsPromotions}}** promociones a LEARNINGS.
#footer: Diferencial, no experimento controlado.
~~~
