#import "../lib/template.typ": cetz, plot
#import "@preview/typsqlite:0.1.0": sqlite

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

#let chart(dataset, summary-sql, show-points: false) = {
  let summary = query(summary-sql(dataset))
  let points = if show-points { query(points-sql(dataset)) } else { () }

  let algorithms = summary.map(r => r.at(0)).dedup()
  let sizes = summary.map(r => r.at(1)).dedup()

  let jitter-width = jitter * calc.min(..sizes.windows(2).map(((a, b)) => calc.log(b / a)))

  let (e-min, e-max) = get-orders((summary + points).map(r => r.at(2)))

  cetz.canvas({
    import cetz.draw: *

    set-style(
      axes: (stroke: .5pt, tick: (stroke: .5pt)),
      legend: (stroke: .5pt),
    )

    plot.plot(
      size: (12, 6),
      x-label: [Network size],
      y-label: [Election time (ms)],

      x-mode: "log",
      x-base: 10,
      x-min: sizes.first() * calc.pow(10.0, -0.1),
      x-max: sizes.last() * calc.pow(10.0, 0.1),
      x-ticks: sizes,
      x-tick-step: none,
      x-grid: true,

      y-mode: "log",
      y-base: 10,
      y-min: calc.pow(10.0, e-min),
      y-max: calc.pow(10.0, e-max),
      y-ticks: range(e-min, e-max + 1).map(e => (calc.pow(10.0, e), $10^#e$)),
      y-tick-step: none,
      y-grid: true,

      legend: "inner-north-west",

      {
        if show-points {
          for (i, algorithm) in algorithms.enumerate() {
            let data = points
              .filter(r => r.at(0) == algorithm)
              .map(((_, size, time, j)) => {
                let fraction = calc.rem(j * golden, 1) * 2 - 1
                let x = size * calc.pow(10.0, fraction * jitter-width)
                (x, time)
              })

            plot.add(
              data,
              style: (stroke: none),
              mark: "o",
              mark-size: .04,
              mark-style: (stroke: none, fill: colors.at(i).transparentize(60%)),
            )
          }
        }

        for (i, algorithm) in algorithms.enumerate() {
          let data = summary.filter(r => r.at(0) == algorithm).map(((_, size, time)) => (size, time))

          plot.add(
            data,
            style: (stroke: 1.2pt + colors.at(i)),
            mark: marks.at(i),
            mark-size: .2,
            mark-style: (stroke: .5pt + black, fill: colors.at(i)),
            label: upper(algorithm.first()) + algorithm.slice(1),
          )
        }
      },
    )
  })
}

= Results

== Median Election Time

#figure(
  chart("default", median-sql, show-points: true),
  caption: [Median election time against network size under the geographic latency profile.],
) <fig:p50-default>

#figure(
  chart("all", median-sql, show-points: true),
  caption: [Median election time against network size under the sparse geographic latency profile.],
) <fig:p50-all>

#figure(
  chart("skewed", median-sql, show-points: true),
  caption: [Median election time against network size under the 95%/5% latency profile.],
) <fig:p50-skewed>

#figure(
  chart("single", median-sql, show-points: true),
  caption: [Median election time against network size under the uniform latency profile.],
) <fig:p50-single>

== Mean Election Time

#figure(
  chart("default", mean-sql),
  caption: [Mean election time against network size under the geographic latency profile.],
) <fig:avg-default>

#figure(
  chart("all", mean-sql),
  caption: [Mean election time against network size under the sparse geographic latency profile.],
) <fig:avg-all>

#figure(
  chart("skewed", mean-sql),
  caption: [Mean election time against network size under the 95%/5% latency profile.],
) <fig:avg-skewed>

#figure(
  chart("single", mean-sql),
  caption: [Mean election time against network size under the uniform latency profile.],
) <fig:avg-single>
