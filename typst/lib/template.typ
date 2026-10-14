#import "@preview/theoretic:0.4.0" as theoretic: qed, theorem
#import "@preview/finite:0.5.1" as finite
#import "@preview/fletcher:0.5.8" as fletcher: diagram, edge, node
#import "@preview/cetz:0.5.2" as cetz
#import "@preview/cetz-plot:0.1.4": plot
#import theoretic.presets.basic: *

#import "./enum-label.typ" as el: enum-label, wrapped-enum-numbering
#import "./pmod.typ": pmod

#let pc = citation => {
  set cite(form: "prose")
  citation
}

#let solution = theorem.with(
  variant: "proof",
  kind: "solution",
  supplement: smallcaps("Solution"),
  number: none,
  suffix: sym.lozenge,
  options: (
    head-font: (style: "normal"),
  ),
)

#let automaton(style: (:), ..rest) = finite.automaton(
  style: (transition: (curve: 0), ..style),
  ..rest,
)

#let template(title: [], enum-numbering: "1.", doc) = [
  #show ref: theoretic.show-ref
  #show ref: el.show-ref

  #set document(title: title, author: "Edmond Cheng, Lachlan Martin, Chino Zhou")
  #set page(
    paper: "a4",
    numbering: "1",
  )
  #set par(justify: true)
  #set text(size: 11pt)
  #set enum(numbering: wrapped-enum-numbering(enum-numbering))
  #show footnote.entry: set text(size: 8pt)

  #align(center, text(title, 17pt))
  #align(center)[
    #columns(3, gutter: 8pt)[
      Edmond Cheng\
      #link("mailto:edmond.cheng@unsw.edu.au")

      #colbreak()

      Lachlan Martin\
      #link("mailto:lachlan.t.martin@unsw.edu.au")

      #colbreak()

      Chino Zhou\
      #link("mailto:tianxiang.zhou2@unsw.edu.au")
    ]
  ]

  #doc
]
