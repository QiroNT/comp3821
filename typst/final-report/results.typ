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
Accross all graphs presented, the scales on both axes are logarithmic.
== Median Election Time
Under the geographic latency profiles (@fig:p50-default, @fig:p50-all), the Bully algorithm shows a linear trend with much higher median finishing times when compared to the other two algorithms. 
The Raft algorithm also shows a linear increase with much lower rate of change and performs at a speed close to that of Paxos.
The Paxos algorithm performs the fastest across all network sizes and shows a near constant trend.
It should be noted that the raft algorithm has large concentrations of finishing times at around $10^4.5$ milliseconds.
#figure(
  chart("default", median-sql, show-points: true),
  caption: [Median election time against network size under the geographic latency profile.],
) <fig:p50-default>

#figure(
  chart("all", median-sql, show-points: true),
  caption: [Median election time against network size under the sparse geographic latency profile.],
) <fig:p50-all>

For network latency profiles that are uniform (@fig:p50-single) or close to uniform (@fig:p50-single), the median trendline for the bully algorithm remains the same.
The results betweent the Paxos and Raft algorithms vary at above 640 nodes.
Here, the Paxos algorithm dramatically increases in election time whilst the raft algorithm remains at around the same finishing time.
It also has high concentrations of finishing times above $10^4$ milliseconds for network sizes larger than 160 nodes.
Both algorithms also show a near constant trendline with the exception of jumps for Paxos after 640 nodes and for raft at 320 nodes.
#figure(
  chart("skewed", median-sql, show-points: true),
  caption: [Median election time against network size under the 95%/5% latency profile.],
) <fig:p50-skewed>

#figure(
  chart("single", median-sql, show-points: true),
  caption: [Median election time against network size under the uniform latency profile.],
) <fig:p50-single>

== Mean Election Time
The Bully algorithm performs the worst on average for geographic latency profiles (@fig:avg-default, @fig:avg-all).
The Raft algorithms comes second and sits at an average finish time between $10^3$ and $10^4$.
The Paxos algorithm on average finishes the fastest and with a near constant average finishing time of $10^2.75$
#figure(
  chart("default", mean-sql),
  caption: [Mean election time against network size under the geographic latency profile.],
) <fig:avg-default>

#figure(
  chart("all", mean-sql),
  caption: [Mean election time against network size under the sparse geographic latency profile.],
) <fig:avg-all>

Under a 95%/5% latency profile (@fig:avg-skewed), both the Bully and Paxos algorithms follow similar linear trendlines.
However, Paxos performs slightly faster on average.
The Raft algorithm performs substantially faster than the others at higher network sizes and performs faster on average at network sizes over 480 nodes.
Both the Raft and Paxos algorithms have higher variance in election time between network sizes when compared to the geographic latency profiles.
#figure(
  chart("skewed", mean-sql),
  caption: [Mean election time against network size under the 95%/5% latency profile.],
) <fig:avg-skewed>

The average election time for the Paxos algorithm is highest under a uniform latency profile (@fig:avg-single).
Following that, the Raft algorithm peforms worse than the Bully algorithm for networks sizes between $40$ to $480$.
After that interval, it performs better on average and experiences as decrease in average election time.
#figure(
  chart("single", mean-sql),
  caption: [Mean election time against network size under the uniform latency profile.],
) <fig:avg-single>
