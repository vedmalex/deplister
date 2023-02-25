// Import the necessary swc modules
const { parseSync } = require('@swc/core')
const Visitor = require('@swc/core/Visitor').default
const fs = require('node:fs')

// Parse the code to generate an AST
const sourceFile = fs.readFileSync('data/ext.js')
const ast2 = parseSync(sourceFile)

class TestVisitor extends Visitor {
  visitModule(module) {
    module.body.forEach(content => {
      console.dir(content)
    })
    return super.visitModule(module)
  }
  visitCallExpression(expression) {
    return super.visitCallExpression(expression)
  }
  // visitObjectExpression()
}

const visitor = new TestVisitor()
visitor.visitProgram(ast2)

// Traverse the AST to find import and require statements
const imports = []
ast2.body.map(node => {
  if (node.type === 'ImportDeclaration') {
    imports.push(node.source.value)
  } else if (node.type === 'CallExpression' && node.callee.name === 'require') {
    imports.push(node.arguments[0].value)
  }
})

console.log('Imports:', imports)
