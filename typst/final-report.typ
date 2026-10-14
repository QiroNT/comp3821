#import "./lib/template.typ": template
#import "final-report/config.typ": *

#show: template.with(
  title: [Evaluating Leader Election Algorithms],
  enum-numbering: "①",
)

#include "./final-report/code.typ"

#if show_demos [
  #include "./final-report/demos.typ"
]

#show bibliography: it => if show_references { it } else { place(hide(it)) }
#bibliography(
  ("./final-report/refs.yml", "./final-report/refs.bib"),
  title: "References",
  style: "./lib/harvard-the-university-of-new-south-wales.csl",
)
