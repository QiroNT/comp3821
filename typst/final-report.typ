#import "./lib/template.typ": template

#show: template.with(
  title: [Evaluating Leader Election Algorithms],
  enum-numbering: "①",
)

#let show_references = true;\
#let show_demos = true;

#if show_demos [
  #include "./final-report/demos.typ"
]

#show bibliography: it => if show_references { it } else { hide(it) }
#bibliography(
  "./final-report/refs.yml",
  title: "References",
  style: "./lib/harvard-the-university-of-new-south-wales.csl",
)
