import { TsType, parseSync } from '@swc/core'
import { Visitor } from '@swc/core/Visitor.js'

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
  const referencedVariables = new Map<string, number>()
  const globalVariables = new Map<string, number>()
  const declaredVariables = new Map<string, number>()

  class VariableDeclaratorVisitor extends Visitor {
    override visitTsType(n: TsType): TsType {
      return n
    }
    override visitVariableDeclarator(path) {
      register(path.id, declaredVariables)
    }
    override visitMemberExpression(member) {
      if (
        member.object.value === 'global' ||
        member.object.value === 'globalThis'
      ) {
        register(member.property, globalVariables)
      } else {
        register(member.object, referencedVariables)
      }
    }
    override visitIdentifier(path) {
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
