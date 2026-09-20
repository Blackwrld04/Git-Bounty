import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { GitService } from '../core/git.js';
import { GibworkService } from '../core/gibwork.js';
import { GitHubService } from '../core/github.js';
import { loadConfig, getBountyRecord, recordBounty, findGitRoot } from '../core/config.js';
export async function runClaim(identifier) {
    const git = new GitService();
    const isRepo = await git.isGitRepo();
    if (!isRepo) {
        console.error(chalk.red('✖ Error: Must be inside a Git repository to claim a bounty.'));
        process.exit(1);
    }
    const spinner = ora(`Resolving bounty details for "${identifier}"...`).start();
    try {
        const config = loadConfig();
        let record = getBountyRecord(identifier);
        let title = record?.title || '';
        let reward = record?.rewardAmount || '0';
        let taskId = record?.taskId || '';
        let issueNumber = record?.issueNumber;
        const gibwork = new GibworkService(undefined, config.network === 'production');
        // If identifier is a pure number, try GitHub issue lookup if not in local records
        const numericIssue = parseInt(identifier, 10);
        if (!record && !isNaN(numericIssue)) {
            issueNumber = numericIssue;
            const repoSlug = config.repo || (await git.getGitHubRepoSlug()) || undefined;
            const gh = new GitHubService(repoSlug);
            try {
                const issue = await gh.getIssue(issueNumber);
                title = issue.title;
            }
            catch { }
        }
        else if (!record) {
            // Identifier is likely a taskId
            taskId = identifier;
            try {
                const taskDetails = await gibwork.getTask(taskId);
                title = taskDetails.title || 'Gibwork Bounty';
                reward = taskDetails.payment?.amount || taskDetails.asset?.amount || '0';
            }
            catch (err) {
                spinner.fail(`Could not find task on Gibwork: ${err.message}`);
                process.exit(1);
            }
        }
        spinner.succeed(`Identified bounty: "${chalk.bold(title || identifier)}"`);
        // Determine branch name
        const sanitizedTitle = (title || 'task')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 24);
        const branchName = issueNumber
            ? `bounty/issue-${issueNumber}-${sanitizedTitle}`
            : `bounty/task-${(taskId || 'work').slice(0, 8)}`;
        const branchSpinner = ora(`Checking out bounty branch: ${chalk.cyan(branchName)}...`).start();
        await git.checkoutBountyBranch(branchName);
        branchSpinner.succeed(`Switched to branch ${chalk.bold.cyan(branchName)}`);
        // Scaffold .bounty/SPEC.md
        const bountyDir = path.join(findGitRoot(), '.bounty');
        if (!fs.existsSync(bountyDir)) {
            fs.mkdirSync(bountyDir, { recursive: true });
        }
        const specContent = [
            `# Bounty Specification: ${title || identifier}`,
            ``,
            `* **Task ID**: \`${taskId || 'Pending'}\``,
            issueNumber ? `* **GitHub Issue**: #${issueNumber}` : '',
            `* **Reward**: ${reward} ${config.defaultTokenSymbol}`,
            `* **Branch**: \`${branchName}\``,
            `* **Status**: In Progress`,
            ``,
            `## Deliverables Checklist`,
            `- [ ] Implement required bug fix or feature.`,
            `- [ ] Add or update automated test suites.`,
            `- [ ] Ensure \`${config.testCommand}\` passes with 0 errors.`,
            `- [ ] Verify git working tree is clean.`,
            ``,
            `## Next Steps`,
            `1. Write your code and make local git commits.`,
            `2. Verify locally: \`git bounty test\``,
            `3. Submit your completed proof of work: \`git bounty submit\``,
        ]
            .filter(Boolean)
            .join('\n');
        fs.writeFileSync(path.join(bountyDir, 'SPEC.md'), specContent, 'utf8');
        // Update local record
        recordBounty({
            taskId: taskId || `temp-${Date.now()}`,
            issueNumber,
            title: title || identifier,
            rewardAmount: reward,
            tokenMint: config.defaultToken,
            status: 'in_progress',
            createdAt: record?.createdAt || new Date().toISOString(),
            branchName,
        });
        console.log(boxen(`${chalk.bold.hex('#14F195')('🎯 Bounty Claimed Successfully!')}\n\n` +
            `• Active Branch: ${chalk.bold.cyan(branchName)}\n` +
            `• Spec File: ${chalk.gray('.bounty/SPEC.md')}\n` +
            `• Test Command: ${chalk.yellow(config.testCommand)}\n\n` +
            `When ready to submit:\n` +
            `  ${chalk.cyan('git bounty test')}    -> Run verification suite\n` +
            `  ${chalk.cyan('git bounty submit')}  -> Package PoW & submit on-chain`, { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }));
    }
    catch (error) {
        spinner.fail(chalk.red(`Failed to claim bounty: ${error.message}`));
        process.exit(1);
    }
}
//# sourceMappingURL=claim.js.map