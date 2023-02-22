import ts from 'typescript'

function getDependencyPath(node, sourceFile) {
  if (ts.isCallExpression(node)) {
    const functionName = node.expression.getText(sourceFile)
    if (functionName === 'require') {
      const arg = node.arguments[0]
      if (arg) {
        return node.getFullText(sourceFile)
      }
    } else if (functionName === 'import') {
      const arg = node.arguments[0]
      if (arg) {
        return node.getFullText(sourceFile)
      }
    }
  }

  return null
}

function getDependencies(file: string) {
  const program = ts.createProgram([file], {})
  const sourceFile = program.getSourceFile(file)
  if (sourceFile) {
    const references: Array<string> = []
    function visitNode(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const resolvedPath = getDependencyPath(node.moduleSpecifier, sourceFile)
        if (resolvedPath) {
          references.push(resolvedPath)
        }
      } else if (ts.isCallExpression(node)) {
        const resolvedPath = getDependencyPath(node, sourceFile)
        if (resolvedPath) {
          references.push(resolvedPath)
        }
      }
      ts.forEachChild(node, visitNode)
    }
    visitNode(sourceFile)
    return {
      file,
      references: [...new Set(references)],
    }
  } else {
    return {
      file,
      references: [],
    }
  }
}

export type Dependency = {
  file: string
  references: Array<string>
}

export function collectDependencies(files: Array<string>) {
  const dependencies: Array<Dependency> = []
  for (const file of files) {
    const deps = getDependencies(file)
    dependencies.push(deps)
  }
  return dependencies
}
