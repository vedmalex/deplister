"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDependencies = void 0;
const tslib_1 = require("tslib");
const typescript_1 = tslib_1.__importDefault(require("typescript"));
function getDependencyPath(node, sourceFile) {
    if (typescript_1.default.isCallExpression(node)) {
        const functionName = node.expression.getText(sourceFile);
        if (functionName === 'require') {
            const arg = node.arguments[0];
            if (arg) {
                return node.getFullText(sourceFile);
            }
        }
        else if (functionName === 'import') {
            const arg = node.arguments[0];
            if (arg) {
                return node.getFullText(sourceFile);
            }
        }
    }
    return null;
}
function getDependencies(file) {
    const program = typescript_1.default.createProgram([file], {});
    const sourceFile = program.getSourceFile(file);
    if (sourceFile) {
        const references = [];
        function visitNode(node) {
            if (typescript_1.default.isImportDeclaration(node)) {
                const resolvedPath = getDependencyPath(node.moduleSpecifier, sourceFile);
                if (resolvedPath) {
                    references.push(resolvedPath);
                }
            }
            else if (typescript_1.default.isCallExpression(node)) {
                const resolvedPath = getDependencyPath(node, sourceFile);
                if (resolvedPath) {
                    references.push(resolvedPath);
                }
            }
            typescript_1.default.forEachChild(node, visitNode);
        }
        visitNode(sourceFile);
        return {
            file,
            references: [...new Set(references)],
        };
    }
    else {
        return {
            file,
            references: [],
        };
    }
}
function collectDependencies(files) {
    const dependencies = [];
    for (const file of files) {
        const deps = getDependencies(file);
        dependencies.push(deps);
    }
    return dependencies;
}
exports.collectDependencies = collectDependencies;
//# sourceMappingURL=index.js.map