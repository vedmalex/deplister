"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDependencies = void 0;
function resolveDependencies(dependencies) {
    var _a;
    const graph = new Map();
    for (const dependency of dependencies) {
        const { file, references } = dependency;
        if (!graph.has(file)) {
            graph.set(file, new Set());
        }
        for (const reference of references) {
            if (!graph.has(reference)) {
                graph.set(reference, new Set());
            }
            (_a = graph.get(file)) === null || _a === void 0 ? void 0 : _a.add(reference);
        }
    }
    const visited = new Set();
    const temp = new Set();
    const cycle = new Set();
    function dfs(node) {
        visited.add(node);
        temp.add(node);
        const neighbors = graph.get(node) || new Set();
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                dfs(neighbor);
            }
            else if (temp.has(neighbor)) {
                cycle.add(neighbor);
            }
        }
        temp.delete(node);
    }
    for (const node of graph.keys()) {
        if (!visited.has(node)) {
            dfs(node);
        }
    }
    if (cycle.size > 0) {
        throw new Error(`Dependency cycle detected: ${Array.from(cycle).join(' -> ')}`);
    }
    const sorted = new Array();
    const unmarked = new Set(graph.keys());
    function visit(node) {
        if (sorted.includes(node)) {
            return;
        }
        if (unmarked.has(node)) {
            unmarked.delete(node);
            const neighbors = graph.get(node) || new Set();
            for (const neighbor of neighbors) {
                visit(neighbor);
            }
            sorted.push(node);
        }
    }
    while (unmarked.size > 0) {
        const node = unmarked.values().next().value;
        visit(node);
    }
    return sorted;
}
exports.resolveDependencies = resolveDependencies;
//# sourceMappingURL=resolver.js.map