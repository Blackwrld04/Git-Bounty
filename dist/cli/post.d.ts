export interface PostOptions {
    reward: string;
    token?: string;
    keypair?: string;
    tags?: string;
    dryRun?: boolean;
}
export declare function runPost(issueNumberStr: string, opts: PostOptions): Promise<void>;
//# sourceMappingURL=post.d.ts.map