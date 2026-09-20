import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

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

export class GitHubService {
  private repoSlug?: string;
  private token?: string;

  constructor(repoSlug?: string) {
    this.repoSlug = repoSlug || process.env.GITHUB_REPOSITORY;
    this.token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  }

  /**
   * Helper to check if gh CLI is available and authenticated
   */
  private async hasGhCli(): Promise<boolean> {
    try {
      await execAsync('gh --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetches GitHub issue details
   */
  async getIssue(issueNumber: number, repo?: string): Promise<GitHubIssue> {
    const targetRepo = repo || this.repoSlug;
    const repoFlag = targetRepo ? `-R ${targetRepo}` : '';

    if (await this.hasGhCli()) {
      try {
        const { stdout } = await execAsync(
          `gh issue view ${issueNumber} ${repoFlag} --json number,title,body,url,labels,author`
        );
        const data = JSON.parse(stdout);
        return {
          number: data.number,
          title: data.title,
          body: data.body || '',
          url: data.url,
          labels: (data.labels || []).map((l: any) => l.name),
          author: data.author?.login || 'unknown',
        };
      } catch (err: any) {
        // Fall back to REST if gh CLI fails
      }
    }

    if (this.token && targetRepo) {
      const res = await fetch(`https://api.github.com/repos/${targetRepo}/issues/${issueNumber}`, {
        headers: {
          Authorization: `token ${this.token}`,
          'User-Agent': 'git-bounty-cli',
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch GitHub issue #${issueNumber}: HTTP ${res.status}`);
      }
      const data = await res.json() as any;
      return {
        number: data.number,
        title: data.title,
        body: data.body || '',
        url: data.html_url,
        labels: (data.labels || []).map((l: any) => l.name),
        author: data.user?.login || 'unknown',
      };
    }

    throw new Error(
      `Cannot fetch GitHub issue #${issueNumber}. Please install and authenticate GitHub CLI ('gh auth login') or set GITHUB_TOKEN.`
    );
  }

  /**
   * Adds a comment to an issue or pull request
   */
  async addComment(issueOrPrNumber: number, comment: string, repo?: string): Promise<void> {
    const targetRepo = repo || this.repoSlug;
    const repoFlag = targetRepo ? `-R ${targetRepo}` : '';

    if (await this.hasGhCli()) {
      try {
        // Escape comment for shell
        const escaped = comment.replace(/"/g, '\\"');
        await execAsync(`gh issue comment ${issueOrPrNumber} ${repoFlag} --body "${escaped}"`);
        return;
      } catch {
        // Fallback to REST
      }
    }

    if (this.token && targetRepo) {
      await fetch(`https://api.github.com/repos/${targetRepo}/issues/${issueOrPrNumber}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `token ${this.token}`,
          'User-Agent': 'git-bounty-cli',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: comment }),
      });
      return;
    }

    // Graceful fallback: print to stdout
    console.log(`\n[GitHub Comment Preview for #${issueOrPrNumber}]:\n${comment}\n`);
  }

  /**
   * Adds a label to an issue (e.g. "bounty: 50 USDC")
   */
  async addLabel(issueNumber: number, labelName: string, repo?: string): Promise<void> {
    const targetRepo = repo || this.repoSlug;
    const repoFlag = targetRepo ? `-R ${targetRepo}` : '';

    if (await this.hasGhCli()) {
      try {
        await execAsync(`gh issue edit ${issueNumber} ${repoFlag} --add-label "${labelName}"`);
        return;
      } catch {
        // Ignore label error if label creation fails
      }
    }
  }

  /**
   * Fetches details of a Pull Request
   */
  async getPullRequest(prNumber: number, repo?: string): Promise<GitHubPR> {
    const targetRepo = repo || this.repoSlug;
    const repoFlag = targetRepo ? `-R ${targetRepo}` : '';

    if (await this.hasGhCli()) {
      const { stdout } = await execAsync(
        `gh pr view ${prNumber} ${repoFlag} --json number,title,body,url,state,merged,headRefName,baseRefName`
      );
      const data = JSON.parse(stdout);
      return {
        number: data.number,
        title: data.title,
        body: data.body || '',
        url: data.url,
        state: data.state,
        merged: data.merged || false,
        headRefName: data.headRefName,
        baseRefName: data.baseRefName,
      };
    }

    if (this.token && targetRepo) {
      const res = await fetch(`https://api.github.com/repos/${targetRepo}/pulls/${prNumber}`, {
        headers: {
          Authorization: `token ${this.token}`,
          'User-Agent': 'git-bounty-cli',
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const data = await res.json() as any;
      return {
        number: data.number,
        title: data.title,
        body: data.body || '',
        url: data.html_url,
        state: data.state,
        merged: data.merged || false,
        headRefName: data.head?.ref || '',
        baseRefName: data.base?.ref || 'main',
      };
    }

    throw new Error('Unable to inspect PR without GitHub CLI or GITHUB_TOKEN.');
  }

  /**
   * Merges a Pull Request
   */
  async mergePullRequest(prNumber: number, repo?: string): Promise<void> {
    const targetRepo = repo || this.repoSlug;
    const repoFlag = targetRepo ? `-R ${targetRepo}` : '';

    if (await this.hasGhCli()) {
      await execAsync(`gh pr merge ${prNumber} ${repoFlag} --squash --delete-branch --auto || gh pr merge ${prNumber} ${repoFlag} --squash --delete-branch`);
      return;
    }

    if (this.token && targetRepo) {
      const res = await fetch(`https://api.github.com/repos/${targetRepo}/pulls/${prNumber}/merge`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${this.token}`,
          'User-Agent': 'git-bounty-cli',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merge_method: 'squash' }),
      });
      if (!res.ok) {
        throw new Error(`Failed to merge PR #${prNumber}: HTTP ${res.status}`);
      }
    }
  }
}
