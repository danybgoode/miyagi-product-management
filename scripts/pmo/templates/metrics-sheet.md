---
title: "PMO metrics sheet - {{window.label}}"
styles:
  fontFamily: "Inter"
  baseFontSize: 15
  lineHeight: 1.6
---

# PMO metrics sheet - {{window.label}}

```cells
Metric,Value,Benchmark,Differential
Stories shipped,{{throughput.shippedStories}},{{benchmarks.storiesShipped}},=B2-C2
Epics shipped,{{throughput.shippedEpics}},{{benchmarks.epicsShipped}},=B3-C3
Deploys,{{deploys.total}},{{benchmarks.deploys}},=B4-C4
PR cycle median hours,{{cycle.medianHours}},{{benchmarks.prCycleMedianHours}},=B5-C5
Epic lead median days,{{epics.medianDays}},{{benchmarks.epicLeadMedianDays}},=B6-C6
Change-fail proxy,{{quality.changeFailProxy}},{{benchmarks.changeFailProxy}},=B7-C7
LEARNINGS promotions,{{docOps.learningsPromotions}},{{benchmarks.learningsPromotions}},=B8-C8
Retro coverage %,{{docOps.retroPercent}},{{benchmarks.retroCoveragePercent}},=B9-C9
```

Notas:

- Las formulas exportan a Excel como formulas vivas.
- Los benchmarks se cargan desde `benchmarks.json` cuando existe; hasta entonces usan ceros de fixture.
- La lectura es diferencial operativo, no experimento controlado.
