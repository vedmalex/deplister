import {
  parseSync,
  ObjectExpression,
  KeyValueProperty,
  ArrayExpression,
  StringLiteral,
  CallExpression,
  ImportDeclaration,
  Expression,
  HasSpan,
  Span,
  Program,
  TsType,
  // printSync,
} from '@swc/core'
import { Visitor } from '@swc/core/Visitor'

import fs from 'node:fs'
// import ts from 'typescript'
import { stdout } from 'process'
import glob from 'glob'
import path from 'node:path'
import { processUnusedAndGlobalVariables } from './ident'

function getProperty(node: ObjectExpression, name: string) {
  const property = node.properties.find(
    p =>
      p.type == 'KeyValueProperty' &&
      p.key.type == 'Identifier' &&
      p.key.value == name,
  )
  return property
}

function extractStringLiteralsFromArray(node: ArrayExpression): string[] {
  return node.elements
    .filter(el => el?.expression.type == 'StringLiteral')
    .map(element =>
      (element?.expression as unknown as StringLiteral).value.trim(),
    )
}

function hasProperty(node: ObjectExpression, name: string): boolean {
  // Iterate through the properties of the ObjectLiteralExpression
  const property = node.properties.find(
    p =>
      p.type == 'KeyValueProperty' &&
      p.key.type == 'Identifier' &&
      p.key.value == name,
  ) as KeyValueProperty

  return !!property
}

function isHasSpan(value): value is HasSpan {
  return typeof value == 'object' && value.span
}

function getValueFrom(source: string, program: Program, node: Span) {
  return source.substring(
    node.start - program.span.start,
    node.end - program.span.start,
  )
}

function getTextOrContent(
  node: Expression,
  sourceFile: string,
  program: Program,
): Array<string> {
  if (node.type == 'StringLiteral') {
    return [node.value.trim()]
  } else if (node.type == 'ArrayExpression') {
    return extractStringLiteralsFromArray(node as unknown as ArrayExpression)
  } else {
    if (isHasSpan(node)) {
      return [getValueFrom(sourceFile, program, node.span).trim()]
    } else return []
  }
}

function getDependencyPathFromObjectLiteral(
  node: ObjectExpression,
  sourceFile: string,
  program: Program,
  rule: ExpressionObject,
) {
  const result: Array<string> = []
  rule.properties.forEach(propName => {
    if (hasProperty(node, propName)) {
      const prop = getProperty(node, propName)
      if (prop?.type === 'KeyValueProperty') {
        result.push(...getTextOrContent(prop.value, sourceFile, program))
      }
    }
  })
  return result
}

function getFunctionName(
  source: string,
  program: Program,
  node: CallExpression,
) {
  let cur = node.callee
  if (isHasSpan(cur)) {
    return getValueFrom(source, program, cur.span)
  } else {
    return getValueFrom(source, program, node.span)
  }
}

function getDependencyPathFromCallExpression(
  node: CallExpression,
  sourceFile: string,
  program: Program,
  rule: ExpressionCall,
) {
  let result: Array<string> = []
  const functionName = getFunctionName(sourceFile, program, node)
  if (rule.name.indexOf(functionName) !== -1) {
    const arg = node.arguments[rule.argument]
    if (arg) {
      if (rule.rules?.length > 0) {
        return scanRules(arg.expression, sourceFile, program, rule.rules)
      } else {
        result.unshift(...getTextOrContent(arg.expression, sourceFile, program))
      }
    }
  }
  return result
}

function getDependencyPath(
  node: Expression,
  sourceFile: string,
  program: Program,
  rule: DepScannerRule,
) {
  if (rule.type == 'CallExpression' && node.type === 'CallExpression') {
    return getDependencyPathFromCallExpression(node, sourceFile, program, rule)
  } else if (
    rule.type == 'ObjectLiteralExpression' &&
    node.type === 'ObjectExpression'
  ) {
    return getDependencyPathFromObjectLiteral(node, sourceFile, program, rule)
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

class RuleVisitor extends Visitor {
  constructor(
    public ImportHandler?: Visitor['visitImportDeclaration'],
    public CallHandler?: Visitor['visitCallExpression'],
  ) {
    super()
  }
  override visitImportDeclaration(n: ImportDeclaration): ImportDeclaration {
    this.ImportHandler?.(n)
    return super.visitImportDeclaration(n)
  }
  override visitCallExpression(n: CallExpression): Expression {
    this.CallHandler?.(n)
    return super.visitCallExpression(n)
  }
  override visitTsType(n: TsType): TsType {
    return n
  }
}

function getDependencies(file: string, config: DepListerConfig) {
  const sourceFile = fs.readFileSync(file).toString()
  const program = parseSync(sourceFile, {
    syntax: file.match(/.ts?$/) ? 'typescript' : 'ecmascript',
  })

  // let st = printSync(program)

  const references: Set<string> = new Set<string>()
  const visitor = new RuleVisitor(
    (node: ImportDeclaration) => {
      if (!config.skipImport) {
        let resolvedPath = [node.source.value]
        addToSet(references, resolvedPath)
      }
      return node
    },
    (node: CallExpression) => {
      let resolvedPath = scanRules(node, sourceFile, program, config.rules)
      addToSet(references, resolvedPath)
      return node
    },
  )

  visitor.visitProgram(program)
  const result: Dependency = {
    file,
    references: [...references],
  }

  if (config.globals || config.unused) {
    const scope = processUnusedAndGlobalVariables(program)
    result.globals = [...scope.globalVariables.keys()]
    result.unused = [...scope.unusedVariables.keys()]
  }

  return result
}

const logline = str => {
  stdout.clearLine(0)
  stdout.cursorTo(0)
  stdout.write(str)
}

export type Dependency = {
  file: string
  references: Array<string>
  globals?: Array<string>
  unused?: Array<string>
}

export type ExpressionCall = {
  type: 'CallExpression'
  name: Array<string>
  argument: number
  rules: Array<DepScannerRule>
}

export type ExpressionObject = {
  type: 'ObjectLiteralExpression'
  properties: Array<string>
  rules: Array<DepScannerRule>
}

export type DepScannerRule = ExpressionObject | ExpressionCall

export type DepListerConfig = {
  /** name of config */
  name: string
  /** cwd for glob */
  cwd: string
  /** short description */
  description: string
  /** skip import expression or not */
  skipImport: boolean
  aggregated: boolean
  /** detect global variable reference */
  globals: boolean
  /** detect unused variable reference */
  unused: boolean
  /** if result must contain only not empty items */
  cleanResult: boolean
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
  node: Expression,
  source: string,
  program: Program,
  rules: Array<DepScannerRule>,
) {
  const result: Array<string> = []
  rules.forEach(rule => {
    const resolvedPath = getDependencyPath(node, source, program, rule)
    result.push(...resolvedPath)
  })
  return result
}

export function processIt(config: DepListerConfig) {
  const search = config.include?.map(
    ig => `${ig}.@(${config.allowed.join('|')})`,
  ) ?? [`**/*.@(${config.allowed.join('|')})`]

  const ignore = [
    ...(config.notallowed
      ? config.include?.map(
          ig => `${ig}.@(${config.notallowed?.join('|')})`,
        ) ?? [`**/*.@(${config.notallowed?.join('|')})`]
      : []),
    ...(config.ignore ?? []),
  ]

  const files: Array<string> = []

  search.map(pattern => {
    const list = glob.sync(pattern, {
      ignore,
      cwd: config.cwd ?? './',
    })
    files.push(...list)
  })

  const result = collectDependencies(files, config)
  if (config.aggregated) {
    return aggregateDependency(result)
  }
  return result
}

export function aggregateDependency(
  result: Array<Dependency>,
  aggrateged: Record<string, Array<string>> = {},
) {
  result.reduce((res, cur) => {
    cur.references.forEach(ref => {
      if (!(ref in res)) {
        res[ref] = []
      }
      res[ref].push(cur.file)
    })
    return res
  }, aggrateged)
  return aggrateged
}

export function collectDependencies(
  files: Array<string>,
  config: DepListerConfig,
) {
  const dependencies: Array<Dependency> = []
  for (const file of files.map(file =>
    path.join(config.cwd ? config.cwd : './', file),
  )) {
    logline(file)
    const deps = getDependencies(file, config)
    dependencies.push(deps)
  }
  logline('')
  return dependencies
}
