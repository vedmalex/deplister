import {
  Argument,
  CallExpression,
  ClassDeclaration,
  Declaration,
  FunctionDeclaration,
  Identifier,
  ImportSpecifier,
  KeyValueProperty,
  MemberExpression,
  Param,
  TsType,
  VariableDeclarator,
  parseSync,
  Node,
  Expression,
  ArrowFunctionExpression,
  FunctionExpression,
} from '@swc/core'
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
  const ast = parseSync(code, { syntax: 'typescript' })
  return processUnusedAndGlobalVariables(ast)
}

export function processUnusedAndGlobalVariables(code) {
  const referencedVariables = new Map<string, number>()
  const globalVariables = new Map<string, number>()
  const declaredVariables = new Map<string, number>()

  function registerReference(path) {
    if (path) {
      if (!declaredVariables.has(path!.value)) {
        // переменная использвана как глобальная
        register(path, globalVariables)
      }
      register(path, referencedVariables)
    }
  }

  function registerDeclaration(path) {
    register(path, declaredVariables)
  }

  class MemberExpressionVisitor extends Visitor {
    ident!: Identifier
    override visitMemberExpression(member: MemberExpression) {
      if (
        member.object.type === 'Identifier' &&
        member.object.value !== 'globalThis' &&
        member.object.value !== 'global'
      ) {
        this.ident = member.object
      }
      return super.visitMemberExpression(member)
    }
    override visitTsType(n: TsType): TsType {
      return n
    }
  }
  function extractIdentifierFor(n: Expression) {
    if (n.type === 'CallExpression') {
      const v = new MemberExpressionVisitor()
      v.visitCallExpression(n)
      if (v.ident) {
        return v.ident
      }
    }
  }

  class VariableDeclaratorVisitor extends Visitor {
    override visitTsType(n: TsType): TsType {
      if (n.type === 'TsTypeReference') {
        registerReference(n.typeName)
      }
      return n
    }
    override visitCallExpression(n: CallExpression) {
      if (n.callee.type !== 'Identifier') {
        registerReference(extractIdentifierFor(n))
      } else {
        registerReference(n.callee)
      }
      return super.visitCallExpression(n)
    }
    override visitArrowFunctionExpression(e: ArrowFunctionExpression) {
      e.params.forEach(p => registerDeclaration(p))
      return super.visitArrowFunctionExpression(e)
    }
    override visitFunctionDeclaration(decl: FunctionDeclaration) {
      registerDeclaration(decl.identifier)
      return super.visitFunctionDeclaration(decl)
    }

    override visitClassDeclaration(decl: ClassDeclaration) {
      registerDeclaration(decl.identifier)
      return super.visitClassDeclaration(decl)
    }

    override visitImportSpecifier(imp: ImportSpecifier) {
      registerDeclaration(imp.local)
      return super.visitImportSpecifier(imp)
    }

    override visitParameter(n: Param) {
      registerDeclaration(n.pat)
      return super.visitParameter(n)
    }
    override visitArgument(n: Argument) {
      if (n.expression.type === 'Identifier') {
        registerReference(n.expression)
      }
      return super.visitArgument(n)
    }
    override visitVariableDeclarator(path: VariableDeclarator) {
      registerDeclaration(path.id)
      return super.visitVariableDeclarator(path)
    }
    override visitMemberExpression(member: MemberExpression) {
      if (
        member.object.type === 'Identifier' &&
        (member.object.value === 'global' ||
          member.object.value === 'globalThis')
      ) {
        register(member.property, globalVariables)
      } else if (member.object.type === 'Identifier') {
        register(member.object, referencedVariables)
      }
      return super.visitMemberExpression(member)
    }

    override visitKeyValueProperty(n: KeyValueProperty) {
      if (n.key.type === 'Computed' && n.key.expression.type === 'Identifier') {
        registerReference(n.key.expression)
      }
      if (n.value.type !== 'Identifier') {
        registerReference(extractIdentifierFor(n.value))
      } else {
        registerReference(n.value)
      }
      return super.visitKeyValueProperty(n)
    }

    // нельзя использовать этот visitor прямо, только через прохождение
    // искомого узла, поскольку Identifier используется много где
    // override visitIdentifier(path: Identifier) {
    //   if (!declaredVariables.has(path.value)) {
    //     // переменная использвана как глобальная
    //     register(path, globalVariables)
    //   }
    //   register(path, referencedVariables)
    // }
  }

  const variableDeclVisitor = new VariableDeclaratorVisitor()

  variableDeclVisitor.visitProgram(code)

  const unusedVariables = new Set<string>()
  globalVariables.forEach((_, key) => {
    if (declaredVariables.has(key)) globalVariables.delete(key)
  })

  declaredVariables.forEach((_, key) => {
    if (!referencedVariables.has(key)) unusedVariables.add(key)
  })

  referencedVariables.forEach((value, key) => {
    if (!declaredVariables.has(key)) globalVariables.set(key, value)
  })
  // console.log(declaredVariables)
  // console.log(referencedVariables)
  return {
    unusedVariables,
    globalVariables,
    referencedVariables,
    declaredVariables,
  }
}
