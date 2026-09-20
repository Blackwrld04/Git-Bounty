import { simpleGit } from 'simple-git';
import { findGitRoot } from './config.js';
export class GitService {
    git;
    rootDir;
    constructor(dir = process.cwd()) {
        this.rootDir = findGitRoot(dir);
        this.git = simpleGit(this.rootDir);
    }
    /**
     * Checks if current folder is inside a git repository
     */
    async isGitRepo() {
        try {
            return await this.git.checkIsRepo();
        }
        catch {
            return false;
        }
    }
    /**
     * Gets current branch name
     */
    async getCurrentBranch() {
        const status = await this.git.status();
        return status.current || 'main';
    }
    /**
     * Gets the GitHub repository slug (owner/repo) from origin remote
     */
    async getGitHubRepoSlug() {
        try {
            const remotes = await this.git.getRemotes(true);
            const origin = remotes.find(r => r.name === 'origin') || remotes[0];
            if (!origin || !origin.refs.fetch)
                return null;
            const url = origin.refs.fetch;
            // Match patterns:
            // git@github.com:owner/repo.git
            // https://github.com/owner/repo.git
            // https://github.com/owner/repo
            const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
            if (match) {
                return `${match[1]}/${match[2]}`;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * Checks if working directory has uncommitted changes
     */
    async isClean() {
        const status = await this.git.status();
        return status.isClean();
    }
    /**
     * Creates and checks out a new branch for a bounty
     */
    async checkoutBountyBranch(branchName) {
        const branches = await this.git.branchLocal();
        if (branches.all.includes(branchName)) {
            await this.git.checkout(branchName);
        }
        else {
            await this.git.checkoutLocalBranch(branchName);
        }
    }
    /**
     * Returns latest commit hash (short or full)
     */
    async getLatestCommitHash(short = false) {
        const log = await this.git.log({ maxCount: 1 });
        if (!log.latest)
            return '0000000';
        return short ? log.latest.hash.substring(0, 7) : log.latest.hash;
    }
    /**
     * Returns git diff stats comparing to target branch (default 'main')
     */
    async getDiffStat(baseBranch = 'main') {
        try {
            const diffSummary = await this.git.diffSummary([`${baseBranch}...HEAD`]);
            return `${diffSummary.changed} files changed, ${diffSummary.insertions} insertions(+), ${diffSummary.deletions} deletions(-)`;
        }
        catch {
            // Fallback: local working diff
            try {
                const diffSummary = await this.git.diffSummary();
                return `${diffSummary.changed} files modified, ${diffSummary.insertions}(+), ${diffSummary.deletions}(-)`;
            }
            catch {
                return 'No diff available';
            }
        }
    }
    /**
     * Gets recent commit messages on the current branch
     */
    async getRecentCommits(maxCount = 5) {
        try {
            const logs = await this.git.log({ maxCount });
            return logs.all.map(c => `${c.hash.substring(0, 7)} - ${c.message}`);
        }
        catch {
            return [];
        }
    }
}
//# sourceMappingURL=git.js.map