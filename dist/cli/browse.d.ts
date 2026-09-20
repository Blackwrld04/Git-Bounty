export interface BrowseOptions {
    minReward?: string;
    tag?: string;
    token?: string;
    network?: 'stage' | 'production';
    page?: string;
    limit?: string;
    json?: boolean;
}
export declare function runBrowse(opts?: BrowseOptions): Promise<void>;
//# sourceMappingURL=browse.d.ts.map