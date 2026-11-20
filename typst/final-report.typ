#import "./lib/template.typ": template, title-line
#import "./final-report/config.typ": *

#include "final-report/coverpage.typ"

#let title = [Evaluating Leader Election Algorithms]
#show: template.with(title: title, enum-numbering: "1.")

// Shows reference to headers as names instead of sections.
// #show ref: it => {
//   let el = it.element
//   if el != none and el.func() == heading {
//     link(el.location(), el.body)
//   } else {
//     it
//   }
// }

#set heading(numbering: "1.1")
//#title-line(title)

#include "./final-report/background.typ"
#include "./final-report/code.typ"
#include "./final-report/method.typ"
#include "./final-report/results.typ"
#include "./final-report/conclusion.typ"

#include "./final-report/acknowledgements.typ"

#if show_demos [
  #include "./final-report/demos.typ"
]

#pagebreak()
#show bibliography: it => if show_references { it } else { place(hide(it)) }
#bibliography(
  ("./final-report/refs.yml", "./final-report/refs.bib"),
  title: "References",
  style: "./lib/harvard-the-university-of-new-south-wales.csl",
)

#pagebreak()
#include "final-report/appendix.typ"