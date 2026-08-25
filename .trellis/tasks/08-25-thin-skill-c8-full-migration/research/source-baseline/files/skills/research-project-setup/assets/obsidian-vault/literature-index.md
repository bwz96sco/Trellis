# Literature Index

## All Notes

```dataview
TABLE authors, year, venue, tags, method, benchmark, metric
FROM "literature/notes"
SORT year DESC
```

## By Method

```dataview
TABLE title, year, benchmark, metric, contribution
FROM "literature/notes"
WHERE method
SORT year DESC
```

## By Benchmark

```dataview
TABLE title, year, method, metric, limitation
FROM "literature/notes"
WHERE benchmark
SORT year DESC
```
