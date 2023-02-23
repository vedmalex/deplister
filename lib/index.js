"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDependencies = void 0;
const typescript_1 = __importDefault(require("typescript"));
const process_1 = require("process");
function getProperty(node, name) {
    const property = node.properties.find(p => typescript_1.default.isPropertyAssignment(p) &&
        typescript_1.default.isIdentifier(p.name) &&
        p.name.text === name);
    if (property && typescript_1.default.isPropertyAssignment(property)) {
        return property.initializer;
    }
}
function extractStringLiteralsFromArray(node) {
    return node.elements
        .filter(typescript_1.default.isStringLiteral)
        .map(element => element.text.trim());
}
function hasProperty(node, propertyName) {
    for (const property of node.properties) {
        if (typescript_1.default.isPropertyAssignment(property)) {
            if (typescript_1.default.isIdentifier(property.name) &&
                property.name.text === propertyName) {
                return true;
            }
        }
    }
    return false;
}
function getTextOrContent(node, sourceFile) {
    if (typescript_1.default.isStringLiteralLike(node)) {
        return node.text.trim();
    }
    else if (typescript_1.default.isArrayLiteralExpression(node)) {
        return extractStringLiteralsFromArray(node);
    }
    else {
        return node.getFullText(sourceFile).trim();
    }
}
function getDependencyPath(node, sourceFile) {
    if (typescript_1.default.isCallExpression(node)) {
        const functionName = node.expression.getText(sourceFile);
        if (functionName === 'require') {
            const arg = node.arguments[0];
            if (arg) {
                return getTextOrContent(arg, sourceFile);
            }
        }
        else if (functionName === 'define') {
            const arg = node.arguments[1];
            if (arg) {
                return getTextOrContent(arg, sourceFile);
            }
        }
        else if (functionName === 'import') {
            const arg = node.arguments[0];
            if (arg) {
                return getTextOrContent(arg, sourceFile);
            }
        }
        else if (functionName === 'Ext.require') {
            const arg = node.arguments[0];
            if (arg) {
                return getTextOrContent(arg, sourceFile);
            }
        }
        else if (functionName === 'Ext.create') {
            const arg = node.arguments[0];
            if (arg) {
                return getTextOrContent(arg, sourceFile);
            }
        }
        else if (functionName === 'Ext.define') {
            const arg = node.arguments[1];
            if (typescript_1.default.isObjectLiteralExpression(arg)) {
                if (hasProperty(arg, 'extend')) {
                    const prop = getProperty(arg, 'extend');
                    return getTextOrContent(prop, sourceFile);
                }
                else if (hasProperty(arg, 'override')) {
                    const prop = getProperty(arg, 'override');
                    return getTextOrContent(prop, sourceFile);
                }
                else if (hasProperty(arg, 'modelName')) {
                    const prop = getProperty(arg, 'modelName');
                    return getTextOrContent(prop, sourceFile);
                }
                else if (hasProperty(arg, 'views')) {
                    const prop = getProperty(arg, 'views');
                    return getTextOrContent(prop, sourceFile);
                }
                else if (hasProperty(arg, 'models')) {
                    const prop = getProperty(arg, 'models');
                    return getTextOrContent(prop, sourceFile);
                }
                else if (hasProperty(arg, 'stores')) {
                    const prop = getProperty(arg, 'stores');
                    return getTextOrContent(prop, sourceFile);
                }
            }
        }
    }
    return null;
}
function addToSet(set, items) {
    if (Array.isArray(items)) {
        items.forEach(itemsI => {
            set.add(itemsI);
        });
    }
    else {
        set.add(items);
    }
}
function getDependencies(file) {
    const program = typescript_1.default.createProgram([file], { allowJs: true });
    const sourceFile = program.getSourceFile(file);
    if (sourceFile) {
        const references = new Set();
        function visitNode(node) {
            if (typescript_1.default.isImportDeclaration(node)) {
                const resolvedPath = getTextOrContent(node.moduleSpecifier, sourceFile);
                if (resolvedPath) {
                    addToSet(references, resolvedPath);
                }
            }
            else if (typescript_1.default.isCallExpression(node)) {
                const resolvedPath = getDependencyPath(node, sourceFile);
                if (resolvedPath) {
                    addToSet(references, resolvedPath);
                }
            }
            typescript_1.default.forEachChild(node, visitNode);
        }
        visitNode(sourceFile);
        return {
            file,
            references: [...references],
        };
    }
    else {
        return {
            file,
            references: [],
        };
    }
}
const logline = str => {
    process_1.stdout.clearLine(0);
    process_1.stdout.cursorTo(0);
    process_1.stdout.write(str);
};
function collectDependencies(files) {
    const dependencies = [];
    for (const file of files) {
        logline(file);
        const deps = getDependencies(file);
        dependencies.push(deps);
    }
    logline('');
    return dependencies;
}
exports.collectDependencies = collectDependencies;
//# sourceMappingURL=index.js.map