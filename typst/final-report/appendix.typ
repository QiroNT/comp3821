#import "../lib/template.typ": pc, cetz, plot
#import "@preview/typsqlite:0.1.0": sqlite

// Code insertion
#let presentCode(file) = {
  let code = read(file).split("// algorithm start").at(1).split("// algorithm end").at(0).trim()
  raw(code, block: true, lang: "ts")
}

// table insertion
#let db = sqlite(read("/assets/bench-cloudping.sqlite", encoding: none))
#let query(sql) = (db.query)(sql).rows

#let colors = (red, blue, green)
#let marks = ("o", "triangle", "square")

#let golden = (1 + calc.sqrt(5)) / 2
#let jitter = 0.3

#let points-sql(dataset) = (
  ```sql
  SELECT
    algorithm,
    nodes,
    time,
    row_number() OVER (PARTITION BY algorithm, nodes ORDER BY time) AS i
  FROM measurements
  WHERE dataset = '{dataset}'
  ORDER BY algorithm, nodes, time
  ```
    .text
    .replace("{dataset}", dataset)
)

#let median-sql(dataset) = (
  ```sql
  WITH ranked AS (
    SELECT
      algorithm,
      nodes,
      time,
      row_number() OVER (PARTITION BY algorithm, nodes ORDER BY time) AS i,
      count(*) OVER (PARTITION BY algorithm, nodes) AS n
    FROM measurements
    WHERE dataset = '{dataset}'
  )
  SELECT algorithm, nodes, avg(time)
  FROM ranked
  WHERE i IN ((n + 1) / 2, (n + 2) / 2)
  GROUP BY algorithm, nodes
  ORDER BY algorithm, nodes
  ```
    .text
    .replace("{dataset}", dataset)
)

#let mean-sql(dataset) = (
  ```sql
  SELECT algorithm, nodes, avg(time)
  FROM measurements
  WHERE dataset = '{dataset}'
  GROUP BY algorithm, nodes
  ORDER BY algorithm, nodes
  ```
    .text
    .replace("{dataset}", dataset)
)

#let get-orders(data) = {
  let e-min = calc.floor(calc.log(calc.min(..data)))
  let e-max = calc.ceil(calc.log(calc.max(..data)))
  return (e-min, e-max)
}

= Appendix <appendix>
== Bully algorithm code <bully-appendix>
#presentCode("../../packages/bully/src/index.ts")
== Paxos algorithm code <paxos-appendix>
#presentCode("../../packages/paxos/src/index.ts")
== Raft algorithm code <raft-appendix>
#presentCode("../../packages/raft/src/index.ts")

== Tables <tables>

#let data-table(dataset, summary-sql) = {
  let summary = query(summary-sql(dataset))

  let algorithms = summary.map(r => r.at(0)).dedup()
  let sizes = summary.map(r => r.at(1)).dedup()

  table(
    columns: (auto,) + (1fr,) * sizes.len(),
    align: (left,) + (right,) * sizes.len(),
    table.header([], ..sizes.map(s => [*#s*])),
    ..algorithms
      .map(a => {
        let l = [*#(upper(a.first()) + a.slice(1))*]
        let rows = summary.filter(r => r.at(0) == a)
        (l, ..rows.map(r => str(calc.round(r.at(2)))))
      })
      .flatten(),
  )
}

#figure(
  data-table("default", median-sql),
  caption: [Median election time against network size under the geographic latency profile.],
) <table:p50-default>

#figure(
  data-table("all", median-sql),
  caption: [Median election time against network size under the sparse geographic latency profile.],
) <table:p50-all>

#figure(
  data-table("skewed", median-sql),
  caption: [Median election time against network size under the 95%/5% latency profile.],
) <table:p50-skewed>

#figure(
  data-table("single", median-sql),
  caption: [Median election time against network size under the uniform latency profile.],
) <table:p50-single>

#figure(
  data-table("default", mean-sql),
  caption: [Mean election time against network size under the geographic latency profile.],
) <table:avg-default>

#figure(
  data-table("all", mean-sql),
  caption: [Mean election time against network size under the sparse geographic latency profile.],
) <table:avg-all>

#figure(
  data-table("skewed", mean-sql),
  caption: [Mean election time against network size under the 95%/5% latency profile.],
) <table:avg-skewed>

#figure(
  data-table("single", mean-sql),
  caption: [Mean election time against network size under the uniform latency profile.],
) <table:avg-single>