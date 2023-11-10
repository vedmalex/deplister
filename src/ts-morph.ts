import { Project, SyntaxKind } from 'ts-morph'

export function findUndefinedVariables(code) {
  const undefinedVariables: Set<{
    name: string
    parent?: string
    ptype?: string
  }> = new Set()

  const project = new Project()
  const sourceFile = project.createSourceFile('temp.ts', code)

  sourceFile.forEachDescendant((node, traversal) => {
    switch (node.getKind()) {
      case SyntaxKind.PropertyAccessExpression:
        {
          if (node.getDescendantsOfKind(SyntaxKind.ThisKeyword).length > 0) {
            traversal.skip()
            break
          }
          let children = node.getDescendantsOfKind(SyntaxKind.Identifier)

          let _node = children[0]
          let name = _node?.getText()
          if (name === 'global' || name === 'globalThis') {
            _node = children[1]
            name = _node?.getText()
          } else if (name === 'this' || name === 'super') {
            traversal.skip()
            break
          }
          if (!_node?.getSymbol()) {
            undefinedVariables.add({
              name: name!,
            })
            traversal.skip()
          } else {
            traversal.skip()
          }
        }
        break
      case SyntaxKind.Identifier:
        {
          let name = node?.getText()
          if (!node?.getSymbol()) {
            undefinedVariables.add({
              name: name!,
            })
            traversal.skip()
          }
        }
        break
      case SyntaxKind.TupleType:
      case SyntaxKind.TypeLiteral:
        traversal.skip()
        break
    }
  })

  return {
    undefinedVariables,
  }
}

const code = `
if (!global.ignoreInvalid) throw new Error(error.msg)
global.USELOCAL
globalThis.USEGLOBAL

Object.defineProperty(req, 'userauthorized', {
  [get]: function (req) {
    return req.isAuthorizedUser()
  },
})

function execute<T extends StageObject>(
  ...args: [_err?: unknown, _context?: unknown, _callback?: CallbackFunction<T & CTX>, ...others: any]
): void | Promise<T & CTX> {
  let [_err, _context, _callback] = args
  let context: CTX
  if (arguments.length == 1) {
    context = _err as CTX
    // promise
  } else if (arguments.length == 2) {
    if (typeof _context === 'function') {
      // callback
      context = _err as CTX
    } else {
      // promise
      context = _context as CTX
    }
  } else {
    // callback
    context = _context as CTX
  }
  context.$options?.tt.take('execute')
  return super.execute(_err, _context as CTX & T, _callback as CallbackFunction<T & CTX>)
}

req.isWebUser = function () {
  var result = false
  if (this.session && this.session.profile && Grainjs.Profiles.hasOwnProperty(this.session.profile)) {
    result = !!Grainjs.Profiles[this.session.profile].web
  }
  return result
}
`

const result = findUndefinedVariables(code)
console.log('Undefined variables:', result.undefinedVariables)
