#import "../lib/template.typ": pc

#let presentCode(file) = {
  let code = read(file).split("// algorithm start").at(1).split("// algorithm end").at(0).trim()
  raw(code, block: true, lang: "ts")
}

= Appendix <appendix>
== Bully algorithm code <bully-appendix>
#presentCode("../../packages/bully/src/index.ts")
== Paxos algorithm code <paxos-appendix>
#presentCode("../../packages/paxos/src/index.ts")
== Raft algorithm code <raft-appendix>
#presentCode("../../packages/raft/src/index.ts")