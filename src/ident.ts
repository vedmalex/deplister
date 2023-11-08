const { parseSync } = require('@swc/core')
const { Visitor } = require('@swc/core/Visitor')

function register(identifier, array: Map<string, number>) {
  switch (identifier.type) {
    case 'Identifier':
      if (!array.has(identifier.value)) {
        return array.set(identifier.value, 1)
      } else {
        let count = array.get(identifier.value)!
        return array.set(identifier.value, count + 1)
      }
    case 'KeyValuePatternProperty':
      return register(identifier.value, array)
    case 'RestElement':
      return register(identifier.argument, array)
    case 'AssignmentPatternProperty':
      if (!array.has(identifier.key.value)) {
        return array.set(identifier.key.value, 1)
      } else {
        let count = array.get(identifier.key.value)!
        return array.set(identifier.key.value, count + 1)
      }
    case 'ObjectPattern':
      return identifier.properties.forEach(x => register(x, array))
    case 'ArrayPattern':
      return identifier.elements.forEach(x => register(x, array))
  }
}

export function findUnusedAndGlobalVariables(code) {
  const ast = parseSync(code)
  return processUnusedAndGlobalVariables(ast)
}

export function processUnusedAndGlobalVariables(code) {
  console.log('here')
  const referencedVariables = new Map<string, number>()
  const globalVariables = new Map<string, number>()
  const declaredVariables = new Map<string, number>()

  class VariableDeclaratorVisitor extends Visitor {
    visitVariableDeclarator(path) {
      register(path.id, declaredVariables)
    }
    visitMemberExpression(member) {
      if (
        member.object.value === 'global' ||
        member.object.value === 'globalThis'
      ) {
        register(member.property, globalVariables)
      } else {
        register(member.object, referencedVariables)
      }
    }
    visitIdentifier(path) {
      register(path, referencedVariables)
    }
  }

  const variableDeclVisitor = new VariableDeclaratorVisitor()

  variableDeclVisitor.visitProgram(code)

  const unusedVariables = new Set<string>()
  declaredVariables.forEach((_, key) => {
    if (!referencedVariables.has(key)) unusedVariables.add(key)
  })

  referencedVariables.forEach((value, key) => {
    if (!declaredVariables.has(key)) globalVariables.set(key, value)
  })

  return {
    unusedVariables,
    globalVariables,
  }
}
