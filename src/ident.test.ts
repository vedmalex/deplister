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

  test('не смотрит внутрь объекста, без надобности', () => {
    const code = `
    Object.defineProperty(req, 'userauthorized', {
      get: function (req) {
        return req.isAuthorizedUser()
      },
    })`
    const result = findUnusedAndGlobalVariables(code)
    expect([...result.globalVariables.keys()]).toMatchObject(['req', 'Object'])
  })
  test('смотрит внутрь объекста, когда используется ссылка на переменную []', () => {
    const code = `
    Object.defineProperty(req, 'userauthorized', {
      [get]: function (req) {
        return req.isAuthorizedUser()
      },
    })`
    const result = findUnusedAndGlobalVariables(code)
    expect([...result.globalVariables.keys()]).toMatchObject([
      'req',
      'get',
      'Object',
    ])
  })
  test('регистрирует определение класса как переменную', () => {
    const code = `
      export class Basic {
        _verify
        _passReqToCallback
      }`
    const result = findUnusedAndGlobalVariables(code)
    expect([...result.globalVariables.keys()]).toMatchObject([])
    expect([...result.unusedVariables.keys()]).toMatchObject(['Basic'])
  })
  test('регистрирует функцию как переменную', () => {
    const code = `
      export function extractFromRequest(req: GrainJSRequest) {}
      extractFromRequest(10)
      `
    const result = findUnusedAndGlobalVariables(code)
    expect([...result.globalVariables.keys()]).toMatchObject(['GrainJSRequest'])
    expect([...result.unusedVariables.keys()]).toMatchObject(['req'])
  })

  test('регистрирует использование переменных в object выражениях', () => {
    const code = `
      export function logActivity(db, userName, userIP, action, success, sessionID, callback) {
        new (db.model('Application.UserActivityLog'))({
          userName: userName,
          userIP: userIP,
          action: action,
          result: success,
          sessionID: sessionID,
          timestamp: new Date(),
        })
      }
    `

    const result = findUnusedAndGlobalVariables(code)
    expect([...result.globalVariables.keys()]).toMatchObject([])
    expect([...result.unusedVariables.keys()]).toMatchObject([
      'logActivity',
      'callback',
    ])
  })
  test('регистрирует использование переменных в arrow function', () => {
    const code = `
      const f = x => register(x, array)
    `
    const result = findUnusedAndGlobalVariables(code)
    expect([...result.unusedVariables.keys()]).toMatchObject(['f'])
    expect([...result.globalVariables.keys()]).toMatchObject([
      'register',
      'array',
    ])
  })
  test('регистрирует использование переменных в function expression', () => {
    const code = `
    export function deserializeUser(id, done) {
      global.dbPool
        .exec(function (err, user) {
          logger.trace('deserialize', 'success id:', id, 'user', user.login)
        })
    }
    `
    const result = findUnusedAndGlobalVariables(code)
    console.log(result)
    expect([...result.unusedVariables.keys()]).toMatchObject([
      'deserializeUser',
      'done',
      'err',
    ])
    expect([...result.globalVariables.keys()]).toMatchObject([
      'dbPool',
      'logger',
    ])
  })
})
