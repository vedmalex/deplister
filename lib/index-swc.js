"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectDependencies = exports.processIt = void 0;
const core_1 = require("@swc/core");
const Visitor_1 = require("@swc/core/Visitor");
const node_fs_1 = __importDefault(require("node:fs"));
const process_1 = require("process");
const glob_1 = __importDefault(require("glob"));
const node_path_1 = __importDefault(require("node:path"));
function getProperty(node, name) {
    const property = node.properties.find(p => p.type == 'KeyValueProperty' &&
        p.key.type == 'Identifier' &&
        p.value.type == 'StringLiteral' &&
        p.value.value == name);
    return property;
}
function extractStringLiteralsFromArray(node) {
    return node.elements
        .filter(el => (el === null || el === void 0 ? void 0 : el.expression.type) == 'StringLiteral')
        .map(element => element.value.trim());
}
function hasProperty(node, name) {
    const property = node.properties.find(p => p.type == 'KeyValueProperty' &&
        p.key.type == 'Identifier' &&
        p.value.type == 'StringLiteral' &&
        p.value.value == name);
    return !!property;
}
function isHasSpan(value) {
    return typeof value == 'object' && value.span;
}
function getValueFrom(source, node) {
    return source.substring(node.start, node.end);
}
function getTextOrContent(node, sourceFile) {
    if (node.type == 'StringLiteral') {
        return [node.value.trim()];
    }
    else if (node.type == 'ArrayExpression') {
        return extractStringLiteralsFromArray(node);
    }
    else {
        if (isHasSpan(node)) {
            return [getValueFrom(sourceFile, node.span).trim()];
        }
        else
            return [];
    }
}
function getDependencyPathFromObjectLiteral(node, sourceFile, rule) {
    const result = [];
    rule.properties.forEach(propName => {
        if (hasProperty(node, propName)) {
            const prop = getProperty(node, propName);
            if ((prop === null || prop === void 0 ? void 0 : prop.type) === 'KeyValueProperty') {
                result.push(...getTextOrContent(prop.value, sourceFile));
            }
        }
    });
    return result;
}
function getDependencyPathFromCallExpression(node, sourceFile, rule) {
    var _a;
    let result = [];
    const functionName = getValueFrom(sourceFile, node.span);
    if (rule.name.indexOf(functionName) !== -1) {
        const arg = node.arguments[rule.argument];
        if (arg) {
            if (((_a = rule.rules) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                return scanRules(arg.expression, sourceFile, rule.rules);
            }
            else {
                result.unshift(...getTextOrContent(arg.expression, sourceFile));
            }
        }
    }
    return result;
}
function getDependencyPath(node, sourceFile, rule) {
    if (rule.type == 'CallExpression' && node.type === 'CallExpression') {
        return getDependencyPathFromCallExpression(node, sourceFile, rule);
    }
    else if (rule.type == 'ObjectLiteralExpression' &&
        node.type === 'ObjectExpression') {
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
class RuleVisitor extends Visitor_1.Visitor {
    constructor(ImportHandler, CallHandler) {
        super();
        this.ImportHandler = ImportHandler;
        this.CallHandler = CallHandler;
    }
    visitImportDeclaration(n) {
        return super.visitImportDeclaration(n);
    }
    visitCallExpression(n) {
        return super.visitCallExpression(n);
    }
    visitTsType(n) {
        return n;
    }
}
function getDependencies(file, config) {
    const sourceFile = node_fs_1.default.readFileSync(file).toString();
    const program = (0, core_1.parseSync)(sourceFile, {
        syntax: file.match(/.ts?$/) ? 'typescript' : 'ecmascript',
    });
    const references = new Set();
    const visitor = new RuleVisitor((node) => {
        if (!config.skipImport) {
            let resolvedPath = [node.source.value];
            addToSet(references, resolvedPath);
        }
        return node;
    }, (node) => {
        let resolvedPath = scanRules(node, sourceFile, config.rules);
        addToSet(references, resolvedPath);
        return node;
    });
    visitor.visitProgram(program);
    return {
        file,
        references: [...references],
    };
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
    for (const file of files.map(file => node_path_1.default.join(config.cwd ? config.cwd : './', file))) {
        logline(file);
        const deps = getDependencies(file, config);
        dependencies.push(deps);
    }
    logline('');
    return dependencies;
}
exports.collectDependencies = collectDependencies;
//# sourceMappingURL=index-swc.js.map