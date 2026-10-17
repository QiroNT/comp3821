#import "../lib/template.typ": (
  automaton, cetz, claim, diagram, edge, enum-label, finite, node, pc, plot, pmod, proof, solution, template,
)

= Demos

Hi! This is a small demo section to show the usage of some library functions. These are mostly pulled from my past
assignments.

== Compiling

To open a preview in browser (requires `tinymist`):\
`tinymist preview --partial-rendering=true --invert-colors=auto --root=. ./typst/final-report.typ`

To compile to PDF:\
`typst compile --root=. ./typst/final-report.typ`

To convert a `.bib` reference to yaml for editing (requires `hayagriva`):\
`hayagriva some.bib`

Setup tinymist and configure it as your formatter on save! It will save you a lot of time. It has auto equation/table
aligning, and usual stuffs like auto indentation.

== Referencing

#pc[@alonso-eoap] show that first year university students who finished a peer-mentoring program has 26% decrease in
dropout rate and 11% increase in average grade @alonso-eoap. [...]

_References are clickable. If a references is declared in the yaml but unused, it will not be included in the references
section._

== Claims & Proofs

#claim(title: "P = NP")[
  All problems that can be verified in polynomial time can be solved in polynomial time.
]

#proof[
  I have discovered a truly marvelous proof of this, which this margin is too narrow to contain.
]

#solution[
  Left as an exercise to the reader.
]

== Enum Labeling

We construct an enumerator for the language as follows:

+ #enum-label("e-m") Enumerate over every $chevron.l M chevron.r$ of increasing size. Dovetailed with,
+ #enum-label("e-w") Enumerate over every $w$ of length $2^(|chevron.l M chevron.r|)$. Dovetailed with,
+ #enum-label("e-acc") Run computation of $M$ on $w$. If $M$ enters an accepting state, print $chevron.l M chevron.r$.

From the definition of TM, @e-acc[step] will always print $chevron.l M chevron.r$ in finite time if $M$ accepts $w$.
@e-w[Step] has a finite amount of possible $w$. Thus, given that the size of a TM $M$ is always finite, if such $M$
accepts a word of length $2^(|chevron.l M chevron.r|)$, it will be printed by the enumerator in finite time.

_Try clicking here -\> @e-acc[step] \<-._

== Pmod

We will prove by contradiction. Assume there exists some $n in ZZ$ such that $79n + 42$, $79 (n + 1) + 42$,
$79 (n + 2) + 42$ are all perfect squares. Taking the modulo $8$ of the supposed perfect squares, we have
$
         79n + 42 & equiv 7n + 2 && pmod(8), \
  79 (n + 1) + 42 & equiv 7n + 1 && pmod(8), \
  79 (n + 2) + 42 & equiv 7n     && pmod(8),
$
which implies the modulo $8$ of the perfect squares must be $3$ consecutive integers.

== Finite

#automaton(
  (
    q1: (q2: 0, q4: 1),
    q2: (q3: 1, q2: 0),
    q3: (q2: 0, q3: 1),
    q4: (q5: 0, q4: 1),
    q5: (q4: 1, q5: 0),
  ),
  final: ("q3",),
  layout: finite.layout.custom.with(positions: (
    q1: (0, 0),
    q2: (3, 1.5),
    q3: (6, 1.5),
    q4: (3, -1.5),
    q5: (6, -1.5),
  )),
  style: (
    transition: (curve: 0),
    q2-q3: (curve: 0.5),
    q3-q2: (curve: 0.5),
    q4-q5: (curve: 0.5),
    q5-q4: (curve: 0.5),
    q4-q4: (anchor: bottom),
    q5-q5: (anchor: bottom),
  ),
)

== Tables

#align(center)[
  #table(
    columns: 9,
    align: center,
    [$x$], [$0$], [$0$], [$0$], [$0$], [$1$], [$1$], [$1$], [$1$],
    [$y$], [$0$], [$0$], [$1$], [$1$], [$0$], [$0$], [$1$], [$1$],
    [$z$], [$0$], [$1$], [$0$], [$1$], [$0$], [$1$], [$0$], [$1$],
    [$\#_01$], [$+0$], [$+1$], [$+0$], [$+0$], [$+0$], [$+0$], [$+1$], [$+0$],
    [$\#_10$], [$+0$], [$+1$], [$+0$], [$+0$], [$+0$], [$+0$], [$+1$], [$+0$],
    [$\#_01 - \#_10$], [$+0$], [$+0$], [$+0$], [$+0$], [$+0$], [$+0$], [$+0$], [$+0$],
  )
]

== Graphs

#cetz.canvas({
  import cetz.draw: *

  rect((0, -0), (2, -1), name: "e-a")
  content("e-a", [Exp])
  rect((2, -0), (4, -1), name: "e-b")
  content("e-b", [Exp])
  rect((4, -0), (6, -1), name: "e-c")
  content("e-c", [Exp])
  rect((6, -0), (8, -1), name: "e-d")
  content("e-d", [Exp])

  rect((0, -1), (4, -2), name: "c-a")
  content("c-a", [Cat A])
  content("c-a.south-east", [Cap $q_A$], anchor: "south-east", padding: .1)

  rect((4, -1), (8, -2), name: "c-b")
  content("c-b", [Cat B])
  content("c-b.south-east", [Cap $q_B$], anchor: "south-east", padding: .1)

  rect((8, -1), (10, -2), name: "e-e")
  content("e-e", [Exp])

  rect((0, -2), (10, -3), name: "c-c")
  content("c-c", [Category C])
  content("c-c.south-east", [Cap $q_C$], anchor: "south-east", padding: .1)

  rect((10, -1), (12, -2), name: "e-f")
  content("e-f", [Exp])
  rect((12, -1), (14, -2), name: "e-g")
  content("e-g", [Exp])

  rect((10, -2), (14, -3), name: "c-d")
  content("c-d", [Cat D])
  content("c-d.south-east", [Cap $q_D$], anchor: "south-east", padding: .1)
})

#align(center)[
  #diagram(node-stroke: .1em, {
    node((0, 0), $c_1$)
    edge((1, 0.5), "->")
    node((0, 1), $c_2$)
    edge("->")
    node((1, 0.5), $c_3$)
    edge("->")
    edge((2, 1), "->")
    node((2, 0), $c_4$)
    node((2, 1), $c_5$)
    edge("->")
    node((3, 1), $c_6$)
  })
]

#figure(
  caption: [The graphs of the implicitly defined curves. From left to right: \
    $y^2 = x^3 + 2x + 2, y^2 = x^3 − 2x + 1, y^2 = x^3 − 2x + 2.$],
  grid(
    columns: 3,
    gutter: 17pt,
    cetz.canvas({
      import cetz.draw: *

      set-style(
        axes: (stroke: .5pt, tick: (stroke: .5pt)),
        legend: (stroke: none, orientation: ttb, item: (spacing: .3), scale: 80%),
      )

      plot.plot(
        size: (3, 6),
        x-tick-step: 1,
        y-tick-step: 1,
        x-min: -2,
        x-equal: "y",
        axis-style: "school-book",
        {
          // notice here that i'm actually defining the equations
          let fn = (
            x => calc.sqrt(calc.pow(x, 3) + 2 * x + 2),
            x => -calc.sqrt(calc.pow(x, 3) + 2 * x + 2),
          )
          for f in fn {
            plot.add(
              f,
              domain: (-0.77091699705924, 3),
              samples: 200,
              style: (stroke: black),
            )
          }
        },
      )
    }),
    cetz.canvas({
      import cetz.draw: *

      set-style(
        axes: (stroke: .5pt, tick: (stroke: .5pt)),
        legend: (stroke: none, orientation: ttb, item: (spacing: .3), scale: 80%),
      )

      plot.plot(
        size: (3, 6),
        x-tick-step: 1,
        y-tick-step: 1,
        x-min: -2,
        x-equals: "y",
        axis-style: "school-book",
        {
          let fn = (
            x => calc.sqrt(calc.pow(x, 3) - 2 * x + 1),
            x => -calc.sqrt(calc.pow(x, 3) - 2 * x + 1),
          )
          for f in fn {
            plot.add(
              f,
              domain: (-calc.sqrt(5) / 2 - 1 / 2, calc.sqrt(5) / 2 - 1 / 2),
              samples: 200,
              style: (stroke: black),
            )
          }
          for f in fn {
            plot.add(
              f,
              domain: (1, 3),
              samples: 200,
              style: (stroke: black),
            )
          }
        },
      )
    }),
    cetz.canvas({
      import cetz.draw: *

      set-style(
        axes: (stroke: .5pt, tick: (stroke: .5pt)),
        legend: (stroke: none, orientation: ttb, item: (spacing: .3), scale: 80%),
      )

      plot.plot(
        size: (3, 6),
        x-tick-step: 1,
        y-tick-step: 1,
        x-min: -2,
        x-equals: "y",
        axis-style: "school-book",
        {
          let fn = (
            x => calc.sqrt(calc.pow(x, 3) - 2 * x + 2),
            x => -calc.sqrt(calc.pow(x, 3) - 2 * x + 2),
          )
          for f in fn {
            plot.add(
              f,
              domain: (-1.7692923542386, 3),
              samples: 200,
              style: (stroke: black),
            )
          }
        },
      )
    }),
  ),
)
