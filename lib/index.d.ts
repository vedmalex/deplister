export type Dependency = {
    file: string;
    references: Array<string | Dependency>;
};
export type CallExpression = {
    type: 'CallExpression';
    name: Array<string>;
    argument: number;
    rules: Array<DepScannerRule>;
};
export type ObjectLiteralExpression = {
    type: 'ObjectLiteralExpression';
    properties: Array<string>;
    rules: Array<DepScannerRule>;
};
export type DepScannerRule = ObjectLiteralExpression | CallExpression;
export type DepListerConfig = {
    name: string;
    description: string;
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
//# sourceMappingURL=index.d.ts.map