#let pmod-spacing = state("pmod-spacing", $space.med$)

#let pmod(m) = context pmod-spacing.get() + $(mod med #m)$

#let pmod-show(it) = {
  show math.equation.where(block: true): it => {
    pmod-spacing.update($space.quad$)
    it
  }
  show math.equation.where(block: false): it => {
    pmod-spacing.update($space.med$)
    it
  }

  it
}
