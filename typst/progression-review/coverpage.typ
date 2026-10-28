#let title-page(title:[], people:[], fill: yellow, body) = {
  set page(fill: rgb("#fffac2"), margin: (top: 1.5in, rest: 2in))
  set text(font: "Source Sans Pro", size: 14pt)
  set heading(numbering: "1.1.1")
  line(start: (0%, 0%), end: (8.5in, 0%), stroke: (thickness: 2pt))
  align(horizon + left)[
    #text(size: 24pt, title)\
    #v(1em)
    Progression Review
    #v(2em)
    #for (zid, name) in people [
      #name (#zid), 
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
  AkinduZID: "Akindu Jayatilleke",
  z5645020: "Chino Zhou",
  z5689122: "Edmond Cheng",
  z5691769: "Lachlan Martin",
  GiaZID: "Gia Phat Bui",
)

#show: body => title-page(
  title: [Evaluating Leader Election Algorithms],
  people: group,
  body
)