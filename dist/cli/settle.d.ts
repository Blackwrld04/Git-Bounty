export interface SettleOptions {
    submission?: string;
    amount?: string;
    rating?: string;
    noMerge?: boolean;
    keypair?: string;
    yes?: boolean;
}
export declare function runSettle(prNumberStr: string, opts?: SettleOptions): Promise<void>;
//# sourceMappingURL=settle.d.ts.map