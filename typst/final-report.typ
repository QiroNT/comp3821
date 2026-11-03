#import "./lib/template.typ": template, title-line
#import "./final-report/config.typ": *

#let title = [Evaluating Leader Election Algorithms]
#show: template.with(title: title, enum-numbering: "①")
#title-line(title)

#include "./final-report/code.typ"
#include "./final-report/method.typ"
#include "./final-report/results.typ"
#include "./final-report/conclusion.typ"

#if show_demos [
  #include "./final-report/demos.typ"
]

#show bibliography: it => if show_references { it } else { place(hide(it)) }
#bibliography(
  ("./final-report/refs.yml", "./final-report/refs.bib"),
  title: "References",
  style: "./lib/harvard-the-university-of-new-south-wales.csl",
)
