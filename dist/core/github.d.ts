export interface GitHubIssue {
    number: number;
    title: string;
    body: string;
    url: string;
    labels: string[];
    author: string;
}
export interface GitHubPR {
    number: number;
    title: string;
    body: string;
    url: string;
    state: string;
    merged: boolean;
    headRefName: string;
    baseRefName: string;
}
export declare class GitHubService {
    private repoSlug?;
    private token?;
    constructor(repoSlug?: string);
    /**
     * Helper to check if gh CLI is available and authenticated
     */
    private hasGhCli;
    /**
     * Fetches GitHub issue details
     */
    getIssue(issueNumber: number, repo?: string): Promise<GitHubIssue>;
    /**
     * Adds a comment to an issue or pull request
     */
    addComment(issueOrPrNumber: number, comment: string, repo?: string): Promise<void>;
    /**
     * Adds a label to an issue (e.g. "bounty: 50 USDC")
     */
    addLabel(issueNumber: number, labelName: string, repo?: string): Promise<void>;
    /**
     * Fetches details of a Pull Request
     */
    getPullRequest(prNumber: number, repo?: string): Promise<GitHubPR>;
    /**
     * Merges a Pull Request
     */
    mergePullRequest(prNumber: number, repo?: string): Promise<void>;
}
//# sourceMappingURL=github.d.ts.map