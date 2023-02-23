import ts from 'typescript'
import { stdout } from 'process'
import glob from 'glob'

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

function getTextOrContent(node, sourceFile): Array<string> {
  if (ts.isStringLiteralLike(node)) {
    return [node.text.trim()]
  } else if (ts.isArrayLiteralExpression(node)) {
    return extractStringLiteralsFromArray(node)
  } else {
    return [node.getFullText(sourceFile).trim()]
  }
}

function getDependencyPathFromObjectLiteral(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  rule: ObjectLiteralExpression,
) {
  const result: Array<string> = []
  rule.properties.forEach(propName => {
    if (hasProperty(node, propName)) {
      const prop = getProperty(node, propName)
      result.push(...getTextOrContent(prop, sourceFile))
    }
  })
  return result
}

function getDependencyPathFromCallExpression(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  rule: CallExpression,
) {
  let result: Array<string> = []
  const functionName = node.expression.getText(sourceFile)
  if (rule.name.indexOf(functionName) !== -1) {
    const arg = node.arguments[rule.argument]
    if (arg) {
      if (rule.rules?.length > 0) {
        return scanRules(arg, sourceFile, rule.rules)
      } else {
        result.unshift(...getTextOrContent(arg, sourceFile))
      }
    }
  }
  return result
}

function getDependencyPath(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  rule: DepScannerRule,
) {
  if (rule.type == 'CallExpression' && ts.isCallExpression(node)) {
    return getDependencyPathFromCallExpression(node, sourceFile, rule)
  } else if (
    rule.type == 'ObjectLiteralExpression' &&
    ts.isObjectLiteralExpression(node)
  ) {
    return getDependencyPathFromObjectLiteral(node, sourceFile, rule)
  }
  return []
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

function getDependencies(file: string, config: DepListerConfig) {
  const program = ts.createProgram([file], { allowJs: true })
  const sourceFile = program.getSourceFile(file)
  if (sourceFile) {
    const source = sourceFile
    const references: Set<string> = new Set<string>()
    function visitNode(node: ts.Node) {
      let resolvedPath: Array<string> = []
      if (ts.isImportDeclaration(node)) {
        resolvedPath = getTextOrContent(node.moduleSpecifier, source)
        addToSet(references, resolvedPath)
      } else if (ts.isCallExpression(node)) {
        resolvedPath = scanRules(node, source, config.rules)
      }
      addToSet(references, resolvedPath)
      ts.forEachChild(node, visitNode)
    }
    visitNode(source)
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
  references: Array<string | Dependency>
}

export type CallExpression = {
  type: 'CallExpression'
  name: Array<string>
  argument: number
  rules: Array<DepScannerRule>
}

export type ObjectLiteralExpression = {
  type: 'ObjectLiteralExpression'
  properties: Array<string>
  rules: Array<DepScannerRule>
}

export type DepScannerRule = ObjectLiteralExpression | CallExpression

export type DepListerConfig = {
  /** name of config */
  name: string
  /** short description */
  description: string
  /** output format */
  format: 'json' | 'yaml'
  /** output filename */
  filename: String // deplister
  /** allowed file extension */
  allowed: Array<string>
  /** not allowed file extensions */
  notallowed?: Array<string>
  /** ignored paths */
  ignore?: Array<string>
  /** included path */
  include?: Array<string>
  rules: Array<DepScannerRule>
}

function scanRules(
  node: ts.Node,
  source: ts.SourceFile,
  rules: Array<DepScannerRule>,
) {
  const result: Array<string> = []
  rules.forEach(rule => {
    const resolvedPath = getDependencyPath(node, source, rule)
    result.push(...resolvedPath)
  })
  return result
}

export function processIt(config: DepListerConfig) {
  const search = config.include?.map(
    ig => `${ig}/**/*.@(${config.allowed.join('|')})`,
  ) ?? [`**/*.@(${config.allowed.join('|')})`]

  const ignore = [
    ...(config.notallowed
      ? config.include?.map(
          ig => `${ig}/**/*.@(${config.notallowed?.join('|')})`,
        ) ?? [`**/*.@(${config.notallowed?.join('|')})`]
      : []),
    ...(config.ignore?.map(ig => `${ig}/**/*`) ?? []),
  ]

  const files: Array<string> = []

  search.map(pattern => {
    files.push(
      ...glob.sync(pattern, {
        ignore,
        cwd: './',
      }),
    )
  })

  return collectDependencies(files, config)
}

export function collectDependencies(
  files: Array<string>,
  config: DepListerConfig,
) {
  const dependencies: Array<Dependency> = []
  for (const file of files) {
    logline(file)
    const deps = getDependencies(file, config)
    dependencies.push(deps)
  }
  logline('')
  return dependencies
}
