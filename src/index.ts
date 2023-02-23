import ts from 'typescript'
import { stdout } from 'process'

function getProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const property = node.properties.find(
    p =>
      ts.isPropertyAssignment(p) &&
      ts.isIdentifier(p.name) &&
      p.name.text === name,
  )

  if (property && ts.isPropertyAssignment(property)) {
    return property.initializer
  }
}

function extractStringLiteralsFromArray(
  node: ts.ArrayLiteralExpression,
): string[] {
  return node.elements
    .filter(ts.isStringLiteral)
    .map(element => element.text.trim())
}

function hasProperty(
  node: ts.ObjectLiteralExpression,
  propertyName: string,
): boolean {
  // Iterate through the properties of the ObjectLiteralExpression
  for (const property of node.properties) {
    // Check if the property is a PropertyAssignment
    if (ts.isPropertyAssignment(property)) {
      // Check if the name of the PropertyAssignment matches the propertyName
      if (
        ts.isIdentifier(property.name) &&
        property.name.text === propertyName
      ) {
        return true
      }
    }
  }

  return false
}

function getTextOrContent(node, sourceFile): string | Array<string> {
  if (ts.isStringLiteralLike(node)) {
    return node.text.trim()
  } else if (ts.isArrayLiteralExpression(node)) {
    return extractStringLiteralsFromArray(node)
  } else {
    return node.getFullText(sourceFile).trim()
  }
}

function getDependencyPath(node, sourceFile) {
  if (ts.isCallExpression(node)) {
    const functionName = node.expression.getText(sourceFile)
    if (functionName === 'require') {
      const arg = node.arguments[0]
      if (arg) {
        return getTextOrContent(arg, sourceFile)
      }
    } else if (functionName === 'define') {
      const arg = node.arguments[1]
      if (arg) {
        return getTextOrContent(arg, sourceFile)
      }
    } else if (functionName === 'import') {
      const arg = node.arguments[0]
      if (arg) {
        return getTextOrContent(arg, sourceFile)
      }
    } else if (functionName === 'Ext.require') {
      const arg = node.arguments[0]
      if (arg) {
        return getTextOrContent(arg, sourceFile)
      }
    } else if (functionName === 'Ext.create') {
      const arg = node.arguments[0]
      if (arg) {
        return getTextOrContent(arg, sourceFile)
      }
    } else if (functionName === 'Ext.define') {
      const arg = node.arguments[1]
      if (ts.isObjectLiteralExpression(arg)) {
        if (hasProperty(arg, 'extend')) {
          const prop = getProperty(arg, 'extend')
          return getTextOrContent(prop, sourceFile)
        } else if (hasProperty(arg, 'override')) {
          const prop = getProperty(arg, 'override')
          return getTextOrContent(prop, sourceFile)
        } else if (hasProperty(arg, 'modelName')) {
          const prop = getProperty(arg, 'modelName')
          return getTextOrContent(prop, sourceFile)
        } else if (hasProperty(arg, 'views')) {
          const prop = getProperty(arg, 'views')
          return getTextOrContent(prop, sourceFile)
        } else if (hasProperty(arg, 'models')) {
          const prop = getProperty(arg, 'models')
          return getTextOrContent(prop, sourceFile)
        } else if (hasProperty(arg, 'stores')) {
          const prop = getProperty(arg, 'stores')
          return getTextOrContent(prop, sourceFile)
        }
      }
    }
  }

  return null
}

function addToSet(set: Set<string>, items: string | Array<string>) {
  if (Array.isArray(items)) {
    items.forEach(itemsI => {
      set.add(itemsI)
    })
  } else {
    set.add(items)
  }
}

function getDependencies(file: string) {
  const program = ts.createProgram([file], { allowJs: true })
  const sourceFile = program.getSourceFile(file)
  if (sourceFile) {
    const references: Set<string> = new Set<string>()
    function visitNode(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const resolvedPath = getTextOrContent(node.moduleSpecifier, sourceFile)
        if (resolvedPath) {
          addToSet(references, resolvedPath)
        }
      } else if (ts.isCallExpression(node)) {
        const resolvedPath = getDependencyPath(node, sourceFile)
        if (resolvedPath) {
          addToSet(references, resolvedPath)
        }
      }
      ts.forEachChild(node, visitNode)
    }
    visitNode(sourceFile)
    return {
      file,
      references: [...references],
    }
  } else {
    return {
      file,
      references: [],
    }
  }
}

const logline = str => {
  stdout.clearLine(0)
  stdout.cursorTo(0)
  stdout.write(str)
}

export type Dependency = {
  file: string
  references: Array<string>
}

export function collectDependencies(files: Array<string>) {
  const dependencies: Array<Dependency> = []
  for (const file of files) {
    logline(file)
    const deps = getDependencies(file)
    dependencies.push(deps)
  }
  logline('')
  return dependencies
}
