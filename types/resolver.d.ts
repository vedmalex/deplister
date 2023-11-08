type Dependency = {
    file: string;
    references: Array<string>;
};
export declare function resolveDependencies(dependencies: Array<Dependency>): Array<string>;
export {};
