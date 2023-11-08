import { test, describe, expect } from 'bun:test'
import { findUnusedAndGlobalVariables } from './ident'

describe('unused variable', () => {
  test('works', () => {
    const code = `
  let {bar: boo} = {bar:10}
  let { big } = {big:10}
  let { big:{ name } } = {big:{name:10}}
  let [far, ...foo] = [10, 100, 1000]
  let baz = 100
  global.BAZ = 100
  globalThis.BUR = 100
  globalThis.BAR(man)
  boo.call(1)
  boo["some"]
  big[1]

  switch(boo) {

  }
  `
    const result = findUnusedAndGlobalVariables(code)
    expect([...result.unusedVariables.keys()]).toMatchObject([
      'name',
      'far',
      'foo',
      'baz',
    ])
    expect([...result.globalVariables.keys()]).toMatchObject([
      'BAZ',
      'BUR',
      'BAR',
      'man',
    ])
  })
})
