#let emails(users, domain) = {
  "{"
  users.map(u => link("mailto:" + u + "@" + domain, u)).join(",")
  "}@" + domain
}

#let title-line(title) = [
  #align(center, text(title, 17pt))
  #align(center)[
    Edmond Cheng, Lachlan Martin, Chino Zhou, Akindu Jayatilleke, Gia Phat Bui\
    #emails(("edmond.cheng", "lachlan.t.martin", "tianxiang.zhou2", "a.jayatilleke", "g.bui"), "student.unsw.edu.au")
  ]
]
