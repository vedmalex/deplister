export type Dependency = {
    file: string;
    references: Array<string>;
};
export type ExpressionCall = {
    type: 'CallExpression';
    name: Array<string>;
    argument: number;
    rules: Array<DepScannerRule>;
};
export type ExpressionObject = {
    type: 'ObjectLiteralExpression';
    properties: Array<string>;
    rules: Array<DepScannerRule>;
};
export type DepScannerRule = ExpressionObject | ExpressionCall;
export type DepListerConfig = {
    name: string;
    cwd: string;
    description: string;
    skipImport: boolean;
    aggregated: boolean;
    cleanResult: boolean;
    format: 'json' | 'yaml';
    filename: String;
    allowed: Array<string>;
    notallowed?: Array<string>;
    ignore?: Array<string>;
    include?: Array<string>;
    rules: Array<DepScannerRule>;
};
export declare function processIt(config: DepListerConfig): Dependency[] | Record<string, string[]>;
export declare function aggregateDependency(result: Array<Dependency>, aggrateged?: Record<string, Array<string>>): Record<string, string[]>;
export declare function collectDependencies(files: Array<string>, config: DepListerConfig): Dependency[];
