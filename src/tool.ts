import { Project, SourceFile, Identifier } from 'ts-morph'

function findGlobalVariableReferences(filePath: string): void {
  const project = new Project()
  const sourceFile = project.addSourceFileAtPath(filePath)

  sourceFile.getVariableDeclarationOrThrow
  // Traverse through all nodes in the source file
  sourceFile.forEachDescendant(node => {
    // Check if the node is an identifier
    if (node instanceof Identifier) {
      const symbol = node.getSymbol()

      // Check if the identifier refers to a global variable
      if (
        symbol &&
        symbol.getDeclarations().some(declaration => declaration.getParent())
      ) {
        console.log(`Found global variable reference: ${node.getText()}`)
      }
    }
  })
}

// Usage: specify the file path as a command line argument
const filePath = process.argv[2]
findGlobalVariableReferences(filePath)
