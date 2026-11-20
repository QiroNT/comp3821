#let title-page(title: [], people: [], fill: yellow, body) = {
  set page(fill: rgb("#d3e8fb"), margin: (top: 1.5in, rest: 2in))
  set text(font: "New Computer Modern Math", size: 14pt)
  set heading(numbering: "1.1.1")
  line(start: (0%, 0%), end: (8.5in, 0%), stroke: (thickness: 2pt))
  align(horizon + left)[
    #block(width:auto)[
      #text(size: 24pt, hyphenate: false, title)\
    ]
    #v(1em)
    *Final Report*
    #v(2em)
    #for (zid, name) in people [
      #name (#zid) \
    ]
  ]

  align(bottom + left)[#datetime.today().display()]
  pagebreak()
  set page(fill: none, margin: auto)
  //align(horizon, outline(indent: auto))
  //pagebreak()
  body
}

#let group = (
  z5702573: "Akindu Jayatilleke",
  z5645020: "Chino Zhou",
  z5689122: "Edmond Cheng",
  z5717025: "Gia Phat Bui",
  z5691769: "Lachlan Martin",
)

#set page(numbering: none)
#show: body => title-page(
  title: [Empirically Evaluating Leader Election Algorithms],
  people: group,
  body,
)