export interface InitOptions {
    network?: 'stage' | 'production';
    token?: string;
    testCmd?: string;
    yes?: boolean;
}
export declare function runInit(opts?: InitOptions): Promise<void>;
//# sourceMappingURL=init.d.ts.map