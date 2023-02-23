type Dependency = {
  file: string
  references: Array<string>
}

export function resolveDependencies(
  dependencies: Array<Dependency>,
): Array<string> {
  const graph = new Map<string, Set<string>>()

  // Build the dependency graph
  for (const dependency of dependencies) {
    const { file, references } = dependency
    if (!graph.has(file)) {
      graph.set(file, new Set<string>())
    }
    for (const reference of references) {
      if (!graph.has(reference)) {
        graph.set(reference, new Set<string>())
      }
      graph.get(file)?.add(reference)
    }
  }

  // Check for cycles in the graph
  const visited = new Set<string>()
  const temp = new Set<string>()
  const cycle = new Set<string>()

  function dfs(node: string) {
    visited.add(node)
    temp.add(node)

    const neighbors = graph.get(node) || new Set<string>()
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor)
      } else if (temp.has(neighbor)) {
        cycle.add(neighbor)
      }
    }

    temp.delete(node)
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node)
    }
  }

  if (cycle.size > 0) {
    throw new Error(
      `Dependency cycle detected: ${Array.from(cycle).join(' -> ')}`,
    )
  }

  // Topologically sort the graph
  const sorted = new Array<string>()
  const unmarked = new Set<string>(graph.keys())

  function visit(node: string) {
    if (sorted.includes(node)) {
      return
    }

    if (unmarked.has(node)) {
      unmarked.delete(node)

      const neighbors = graph.get(node) || new Set<string>()
      for (const neighbor of neighbors) {
        visit(neighbor)
      }

      sorted.push(node)
    }
  }

  while (unmarked.size > 0) {
    const node = unmarked.values().next().value
    visit(node)
  }

  return sorted
}
