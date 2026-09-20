export interface SubmitOptions {
    task?: string;
    pr?: string;
    keypair?: string;
    yes?: boolean;
    skipTests?: boolean;
    dryRun?: boolean;
}
export declare function runSubmit(opts?: SubmitOptions): Promise<void>;
//# sourceMappingURL=submit.d.ts.map