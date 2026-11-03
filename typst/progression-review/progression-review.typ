#import "../lib/template.typ": template
#import "./config.typ": *

#show: template.with(
  title: [Evaluating Leader Election Algorithms - Progress Report],
  enum-numbering: "1.",
)

#include "./coverpage.typ"
#include "introduction.typ"
#include "progress.typ"
#include "assessment.typ"
#include "revised-plan.typ"

#show bibliography: it => if show_references { it } else { place(hide(it)) }
#bibliography(
  ("./refs.yml", "./refs.bib"),
  title: "References",
  style: "../lib/harvard-the-university-of-new-south-wales.csl",
)
