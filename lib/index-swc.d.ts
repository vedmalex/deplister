export type Dependency = {
    file: string;
    references: Array<string | Dependency>;
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
    cleanResult: boolean;
    format: 'json' | 'yaml';
    filename: String;
    allowed: Array<string>;
    notallowed?: Array<string>;
    ignore?: Array<string>;
    include?: Array<string>;
    rules: Array<DepScannerRule>;
};
export declare function processIt(config: DepListerConfig): Dependency[];
export declare function collectDependencies(files: Array<string>, config: DepListerConfig): Dependency[];
//# sourceMappingURL=index-swc.d.ts.map