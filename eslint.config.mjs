import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: orig => [
    ...orig,
    '.direnv/',
    'assets/',
  ],
})
