"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDependencies = exports.processIt = void 0;
const typescript_1 = __importDefault(require("typescript"));
const process_1 = require("process");
const glob_1 = __importDefault(require("glob"));
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
        return [node.text.trim()];
    }
    else if (typescript_1.default.isArrayLiteralExpression(node)) {
        return extractStringLiteralsFromArray(node);
    }
    else {
        return [node.getFullText(sourceFile).trim()];
    }
}
function getDependencyPathFromObjectLiteral(node, sourceFile, rule) {
    const result = [];
    rule.properties.forEach(propName => {
        if (hasProperty(node, propName)) {
            const prop = getProperty(node, propName);
            result.push(...getTextOrContent(prop, sourceFile));
        }
    });
    return result;
}
function getDependencyPathFromCallExpression(node, sourceFile, rule) {
    var _a;
    let result = [];
    const functionName = node.expression.getText(sourceFile);
    if (rule.name.indexOf(functionName) !== -1) {
        const arg = node.arguments[rule.argument];
        if (arg) {
            if (((_a = rule.rules) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                return scanRules(arg, sourceFile, rule.rules);
            }
            else {
                result.unshift(...getTextOrContent(arg, sourceFile));
            }
        }
    }
    return result;
}
function getDependencyPath(node, sourceFile, rule) {
    if (rule.type == 'CallExpression' && typescript_1.default.isCallExpression(node)) {
        return getDependencyPathFromCallExpression(node, sourceFile, rule);
    }
    else if (rule.type == 'ObjectLiteralExpression' &&
        typescript_1.default.isObjectLiteralExpression(node)) {
        return getDependencyPathFromObjectLiteral(node, sourceFile, rule);
    }
    return [];
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
function getDependencies(file, config) {
    const program = typescript_1.default.createProgram([file], { allowJs: true });
    const sourceFile = program.getSourceFile(file);
    if (sourceFile) {
        const source = sourceFile;
        const references = new Set();
        function visitNode(node) {
            let resolvedPath = [];
            if (typescript_1.default.isImportDeclaration(node) && !config.skipImport) {
                resolvedPath = getTextOrContent(node.moduleSpecifier, source);
                addToSet(references, resolvedPath);
            }
            else if (typescript_1.default.isCallExpression(node)) {
                resolvedPath = scanRules(node, source, config.rules);
            }
            addToSet(references, resolvedPath);
            typescript_1.default.forEachChild(node, visitNode);
        }
        visitNode(source);
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
function scanRules(node, source, rules) {
    const result = [];
    rules.forEach(rule => {
        const resolvedPath = getDependencyPath(node, source, rule);
        result.push(...resolvedPath);
    });
    return result;
}
function processIt(config) {
    var _a, _b, _c, _d, _e, _f;
    const search = (_b = (_a = config.include) === null || _a === void 0 ? void 0 : _a.map(ig => `${ig}.@(${config.allowed.join('|')})`)) !== null && _b !== void 0 ? _b : [`**/*.@(${config.allowed.join('|')})`];
    const ignore = [
        ...(config.notallowed
            ? (_d = (_c = config.include) === null || _c === void 0 ? void 0 : _c.map(ig => { var _a; return `${ig}.@(${(_a = config.notallowed) === null || _a === void 0 ? void 0 : _a.join('|')})`; })) !== null && _d !== void 0 ? _d : [`**/*.@(${(_e = config.notallowed) === null || _e === void 0 ? void 0 : _e.join('|')})`]
            : []),
        ...((_f = config.ignore) !== null && _f !== void 0 ? _f : []),
    ];
    const files = [];
    search.map(pattern => {
        var _a;
        const list = glob_1.default.sync(pattern, {
            ignore,
            cwd: (_a = config.cwd) !== null && _a !== void 0 ? _a : './',
        });
        files.push(...list);
    });
    return collectDependencies(files, config);
}
exports.processIt = processIt;
function collectDependencies(files, config) {
    const dependencies = [];
    for (const file of files) {
        logline(file);
        const deps = getDependencies(file, config);
        dependencies.push(deps);
    }
    logline('');
    return dependencies;
}
exports.collectDependencies = collectDependencies;
//# sourceMappingURL=index.js.map