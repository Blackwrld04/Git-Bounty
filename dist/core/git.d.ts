export declare class GitService {
    private git;
    readonly rootDir: string;
    constructor(dir?: string);
    /**
     * Checks if current folder is inside a git repository
     */
    isGitRepo(): Promise<boolean>;
    /**
     * Gets current branch name
     */
    getCurrentBranch(): Promise<string>;
    /**
     * Gets the GitHub repository slug (owner/repo) from origin remote
     */
    getGitHubRepoSlug(): Promise<string | null>;
    /**
     * Checks if working directory has uncommitted changes
     */
    isClean(): Promise<boolean>;
    /**
     * Creates and checks out a new branch for a bounty
     */
    checkoutBountyBranch(branchName: string): Promise<void>;
    /**
     * Returns latest commit hash (short or full)
     */
    getLatestCommitHash(short?: boolean): Promise<string>;
    /**
     * Returns git diff stats comparing to target branch (default 'main')
     */
    getDiffStat(baseBranch?: string): Promise<string>;
    /**
     * Gets recent commit messages on the current branch
     */
    getRecentCommits(maxCount?: number): Promise<string[]>;
}
//# sourceMappingURL=git.d.ts.map