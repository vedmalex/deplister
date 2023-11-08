var __require = (id) => {
  return import.meta.require(id);
};

// src/process.ts
import {
parseSync as parseSync2
} from "@swc/core";
import {Visitor as Visitor3} from "@swc/core/Visitor";
import fs from "node:fs";
import {stdout} from "process";
import glob from "glob";
import path from "node:path";

// src/ident.ts
var register = function(identifier, array) {
  switch (identifier.type) {
    case "Identifier":
      if (!array.has(identifier.value)) {
        return array.set(identifier.value, 1);
      } else {
        let count = array.get(identifier.value);
        return array.set(identifier.value, count + 1);
      }
    case "KeyValuePatternProperty":
      return register(identifier.value, array);
    case "RestElement":
      return register(identifier.argument, array);
    case "AssignmentPatternProperty":
      if (!array.has(identifier.key.value)) {
        return array.set(identifier.key.value, 1);
      } else {
        let count = array.get(identifier.key.value);
        return array.set(identifier.key.value, count + 1);
      }
    case "ObjectPattern":
      return identifier.properties.forEach((x) => register(x, array));
    case "ArrayPattern":
      return identifier.elements.forEach((x) => register(x, array));
  }
};
function processUnusedAndGlobalVariables(code) {
  console.log("here");
  const referencedVariables = new Map;
  const globalVariables = new Map;
  const declaredVariables = new Map;

  class VariableDeclaratorVisitor extends Visitor {
    constructor() {
      super(...arguments);
    }
    visitVariableDeclarator(path) {
      register(path.id, declaredVariables);
    }
    visitMemberExpression(member) {
      if (member.object.value === "global" || member.object.value === "globalThis") {
        register(member.property, globalVariables);
      } else {
        register(member.object, referencedVariables);
      }
    }
    visitIdentifier(path) {
      register(path, referencedVariables);
    }
  }
  const variableDeclVisitor = new VariableDeclaratorVisitor;
  variableDeclVisitor.visitProgram(code);
  const unusedVariables = new Set;
  declaredVariables.forEach((_, key) => {
    if (!referencedVariables.has(key))
      unusedVariables.add(key);
  });
  referencedVariables.forEach((value, key) => {
    if (!declaredVariables.has(key))
      globalVariables.set(key, value);
  });
  return {
    unusedVariables,
    globalVariables
  };
}
var { parseSync } = __require("@swc/core");
var { Visitor } = __require("@swc/core/Visitor");

// src/process.ts
var getProperty = function(node, name) {
  const property = node.properties.find((p) => p.type == "KeyValueProperty" && p.key.type == "Identifier" && p.key.value == name);
  return property;
};
var extractStringLiteralsFromArray = function(node) {
  return node.elements.filter((el) => el?.expression.type == "StringLiteral").map((element) => element?.expression.value.trim());
};
var hasProperty = function(node, name) {
  const property = node.properties.find((p) => p.type == "KeyValueProperty" && p.key.type == "Identifier" && p.key.value == name);
  return !!property;
};
var isHasSpan = function(value) {
  return typeof value == "object" && value.span;
};
var getValueFrom = function(source, program, node) {
  return source.substring(node.start - program.span.start, node.end - program.span.start);
};
var getTextOrContent = function(node, sourceFile, program) {
  if (node.type == "StringLiteral") {
    return [node.value.trim()];
  } else if (node.type == "ArrayExpression") {
    return extractStringLiteralsFromArray(node);
  } else {
    if (isHasSpan(node)) {
      return [getValueFrom(sourceFile, program, node.span).trim()];
    } else
      return [];
  }
};
var getDependencyPathFromObjectLiteral = function(node, sourceFile, program, rule) {
  const result = [];
  rule.properties.forEach((propName) => {
    if (hasProperty(node, propName)) {
      const prop = getProperty(node, propName);
      if (prop?.type === "KeyValueProperty") {
        result.push(...getTextOrContent(prop.value, sourceFile, program));
      }
    }
  });
  return result;
};
var getFunctionName = function(source, program, node) {
  let cur = node.callee;
  if (isHasSpan(cur)) {
    return getValueFrom(source, program, cur.span);
  } else {
    return getValueFrom(source, program, node.span);
  }
};
var getDependencyPathFromCallExpression = function(node, sourceFile, program, rule) {
  let result = [];
  const functionName = getFunctionName(sourceFile, program, node);
  if (rule.name.indexOf(functionName) !== -1) {
    const arg = node.arguments[rule.argument];
    if (arg) {
      if (rule.rules?.length > 0) {
        return scanRules(arg.expression, sourceFile, program, rule.rules);
      } else {
        result.unshift(...getTextOrContent(arg.expression, sourceFile, program));
      }
    }
  }
  return result;
};
var getDependencyPath = function(node, sourceFile, program, rule) {
  if (rule.type == "CallExpression" && node.type === "CallExpression") {
    return getDependencyPathFromCallExpression(node, sourceFile, program, rule);
  } else if (rule.type == "ObjectLiteralExpression" && node.type === "ObjectExpression") {
    return getDependencyPathFromObjectLiteral(node, sourceFile, program, rule);
  }
  return [];
};
var addToSet = function(set, items) {
  if (Array.isArray(items)) {
    items.forEach((itemsI) => {
      set.add(itemsI);
    });
  } else {
    set.add(items);
  }
};
var getDependencies = function(file, config) {
  const sourceFile = fs.readFileSync(file).toString();
  const program = parseSync2(sourceFile, {
    syntax: file.match(/.ts?$/) ? "typescript" : "ecmascript"
  });
  const references = new Set;
  const visitor = new RuleVisitor((node) => {
    if (!config.skipImport) {
      let resolvedPath = [node.source.value];
      addToSet(references, resolvedPath);
    }
    return node;
  }, (node) => {
    let resolvedPath = scanRules(node, sourceFile, program, config.rules);
    addToSet(references, resolvedPath);
    return node;
  });
  visitor.visitProgram(program);
  const result = {
    file,
    references: [...references]
  };
  if (config.globals || config.unused) {
    const scope = processUnusedAndGlobalVariables(program);
    result.globals = [...scope.globalVariables.keys()];
    result.unused = [...scope.unusedVariables.keys()];
  }
  return result;
};
var scanRules = function(node, source, program, rules) {
  const result = [];
  rules.forEach((rule) => {
    const resolvedPath = getDependencyPath(node, source, program, rule);
    result.push(...resolvedPath);
  });
  return result;
};
function processIt(config) {
  const search = config.include?.map((ig) => `${ig}.@(${config.allowed.join("|")})`) ?? [`**/*.@(${config.allowed.join("|")})`];
  const ignore = [
    ...config.notallowed ? config.include?.map((ig) => `${ig}.@(${config.notallowed?.join("|")})`) ?? [`**/*.@(${config.notallowed?.join("|")})`] : [],
    ...config.ignore ?? []
  ];
  const files = [];
  search.map((pattern) => {
    const list = glob.sync(pattern, {
      ignore,
      cwd: config.cwd ?? "./"
    });
    files.push(...list);
  });
  const result = collectDependencies(files, config);
  if (config.aggregated) {
    return aggregateDependency(result);
  }
  return result;
}
function aggregateDependency(result, aggrateged = {}) {
  result.reduce((res, cur) => {
    cur.references.forEach((ref) => {
      if (!(ref in res)) {
        res[ref] = [];
      }
      res[ref].push(cur.file);
    });
    return res;
  }, aggrateged);
  return aggrateged;
}
function collectDependencies(files, config) {
  const dependencies = [];
  for (const file of files.map((file2) => path.join(config.cwd ? config.cwd : "./", file2))) {
    logline(file);
    const deps = getDependencies(file, config);
    dependencies.push(deps);
  }
  logline("");
  return dependencies;
}

class RuleVisitor extends Visitor3 {
  ImportHandler;
  CallHandler;
  constructor(ImportHandler, CallHandler) {
    super();
    this.ImportHandler = ImportHandler;
    this.CallHandler = CallHandler;
  }
  visitImportDeclaration(n) {
    this.ImportHandler?.(n);
    return super.visitImportDeclaration(n);
  }
  visitCallExpression(n) {
    this.CallHandler?.(n);
    return super.visitCallExpression(n);
  }
  visitTsType(n) {
    return n;
  }
}
var logline = (str) => {
  stdout.clearLine(0);
  stdout.cursorTo(0);
  stdout.write(str);
};
// src/resolver.ts
function resolveDependencies(dependencies) {
  const graph = new Map;
  for (const dependency of dependencies) {
    const { file, references } = dependency;
    if (!graph.has(file)) {
      graph.set(file, new Set);
    }
    for (const reference of references) {
      if (!graph.has(reference)) {
        graph.set(reference, new Set);
      }
      graph.get(file)?.add(reference);
    }
  }
  const visited = new Set;
  const temp = new Set;
  const cycle = new Set;
  function dfs(node) {
    visited.add(node);
    temp.add(node);
    const neighbors = graph.get(node) || new Set;
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (temp.has(neighbor)) {
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
    throw new Error(`Dependency cycle detected: ${Array.from(cycle).join(" -> ")}`);
  }
  const sorted = new Array;
  const unmarked = new Set(graph.keys());
  function visit(node) {
    if (sorted.includes(node)) {
      return;
    }
    if (unmarked.has(node)) {
      unmarked.delete(node);
      const neighbors = graph.get(node) || new Set;
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
export {
  resolveDependencies,
  processIt,
  collectDependencies,
  aggregateDependency
};
