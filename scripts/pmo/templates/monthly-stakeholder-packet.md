---
title: "PMO mensual - {{window.label}}"
styles:
  fontFamily: "Inter"
  baseFontSize: 15
  lineHeight: 1.65
  h1: { fontSize: 2.0, fontWeight: 700 }
  h2: { fontSize: 1.25, fontWeight: 600 }
---

# PMO mensual - {{window.label}}

## Resumen ejecutivo

Este paquete comunica rendimiento operativo en lenguaje PMO: flujo, DORA, calidad y disciplina documental.
La comparacion externa se presenta como diferencial, no como experimento controlado.

## Indicadores

| Indicador | Valor |
|---|---:|
| Historias shipped | {{throughput.shippedStories}} |
| Epics shipped | {{throughput.shippedEpics}} |
| Deploys por semana | {{deploys.perWeek}} |
| Ciclo PR mediano | {{cycle.medianHours}}h |
| Lead time epic mediano | {{epics.medianDays}} dias |
| Change-failure proxy | {{quality.changeFailureRatePercent}}% |
| Promociones a LEARNINGS | {{docOps.learningsPromotions}} |
| Retro coverage | {{docOps.retroCovered}}/{{docOps.retroTotal}} |

## Benchmarks externos

| Senal comparable | PMO | Benchmark | Lectura |
|---|---:|---:|---|
| Deploys por semana | {{deploys.perWeek}} | {{benchmarks.deploysPerWeek}} | Mayor es mejor |
| PR cycle mediano | {{cycle.medianHours}}h | {{benchmarks.prCycleMedianHours}}h | Menor es mejor |
| Epic lead mediano | {{epics.medianDays}} dias | {{benchmarks.epicLeadMedianDays}} dias | Menor es mejor |
| Change-failure proxy | {{quality.changeFailureRatePercent}}% | {{benchmarks.changeFailureRatePercent}}% | Menor es mejor |

Fuente: {{benchmarks.sourceLine}}. {{benchmarks.framing}}

## Evidencia visual

```chart
{"type":"bar","title":"PMO mensual","labels":["Historias","Epics","Deploys","Doc ops"],"values":[{{throughput.shippedStories}},{{throughput.shippedEpics}},{{deploys.total}},{{docOps.learningsPromotions}}],"color":"#2563eb"}
```

## Lectura

- El throughput se infiere del historial real, no de story points.
- Deploy frequency equivale a merges a `main`, como define WAYS-OF-WORKING.
- Change-fail proxy cuenta reverts/hotfixes.
- Doc-ops mide amplitud de Roadmap, LEARNINGS y retrospectivas.
