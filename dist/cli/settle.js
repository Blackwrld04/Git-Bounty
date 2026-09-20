import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import prompts from 'prompts';
import { GitHubService } from '../core/github.js';
import { GibworkService } from '../core/gibwork.js';
import { GitService } from '../core/git.js';
import { loadConfig, recordBounty, getBountyRecord } from '../core/config.js';
export async function runSettle(prNumberStr, opts = {}) {
    const prNumber = parseInt(prNumberStr, 10);
    if (isNaN(prNumber)) {
        console.error(chalk.red('✖ Error: Invalid PR number. Example: git bounty settle 12'));
        process.exit(1);
    }
    const spinner = ora(`Fetching PR #${prNumber} details from GitHub...`).start();
    try {
        const config = loadConfig();
        const git = new GitService();
        const repoSlug = config.repo || (await git.getGitHubRepoSlug()) || undefined;
        const github = new GitHubService(repoSlug);
        const gibwork = new GibworkService(opts.keypair, config.network === 'production');
        const pr = await github.getPullRequest(prNumber);
        spinner.succeed(`Inspecting PR #${pr.number}: "${chalk.bold(pr.title)}"`);
        // Extract Task ID
        let taskId;
        let submissionId = opts.submission;
        const taskMatch = pr.body.match(/Task ID[:\s*`]+([0-9a-f-]{36})/i) ||
            pr.headRefName.match(/([0-9a-f-]{36})/i);
        if (taskMatch) {
            taskId = taskMatch[1];
        }
        else {
            // Check if branch name matches local config
            for (const b of Object.values(config.bounties)) {
                if (b.branchName === pr.headRefName) {
                    taskId = b.taskId;
                    submissionId = submissionId || b.submissionId;
                    break;
                }
            }
        }
        if (!taskId) {
            console.error(chalk.red('✖ Error: Could not determine Gibwork Task ID for this PR.'));
            console.error(chalk.gray('Please provide task ID or ensure PR description contains "Task ID: <uuid>"'));
            process.exit(1);
        }
        // Resolve submission ID if not passed
        if (!submissionId) {
            const subSpinner = ora('Looking up submissions on Gibwork...').start();
            const submissions = await gibwork.listSubmissions(taskId);
            if (submissions.length === 0) {
                subSpinner.fail('No submissions found on Gibwork for this task.');
                process.exit(1);
            }
            submissionId = submissions[0].submissionId || submissions[0].id;
            subSpinner.succeed(`Selected latest submission: ${chalk.cyan(submissionId)}`);
        }
        const rating = opts.rating ? parseInt(opts.rating, 10) : 5;
        console.log(boxen(`${chalk.bold.hex('#14F195')('⚡ Solana Escrow Payout Settlement')}\n\n` +
            `• PR: ${chalk.bold(`#${pr.number} (${pr.title})`)}\n` +
            `• Task ID: ${chalk.cyan(taskId)}\n` +
            `• Submission ID: ${chalk.cyan(submissionId)}\n` +
            `• Contributor Rating: ${chalk.yellow('★'.repeat(rating))}\n` +
            `• Action: ${opts.noMerge ? chalk.yellow('Release Escrow Only') : chalk.green('Merge PR & Release Escrow')}`, { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }));
        if (!opts.yes) {
            const confirm = await prompts({
                type: 'confirm',
                name: 'proceed',
                message: `Release on-chain Solana escrow payment to contributor?`,
                initial: true,
            });
            if (!confirm.proceed) {
                console.log(chalk.yellow('Settlement aborted.'));
                return;
            }
        }
        // 1. Merge PR if required
        if (!opts.noMerge && !pr.merged) {
            const mergeSpinner = ora(`Merging Pull Request #${pr.number}...`).start();
            try {
                await github.mergePullRequest(pr.number);
                mergeSpinner.succeed(`PR #${pr.number} merged successfully!`);
            }
            catch (err) {
                mergeSpinner.warn(`Could not merge PR automatically: ${err.message}. Proceeding with escrow release...`);
            }
        }
        // 2. Approve and payout via Gibwork SDK
        const payoutSpinner = ora('Signing and broadcasting escrow release on Solana...').start();
        const approvalResult = await gibwork.approveSubmission({
            taskId,
            submissionId: submissionId,
            amount: opts.amount,
            rating,
        });
        payoutSpinner.succeed(chalk.green.bold('Solana escrow funds successfully released to contributor!'));
        // 3. Post confirmation comment to PR
        const commentSpinner = ora('Posting payout receipt to GitHub PR...').start();
        const commentBody = [
            `### 💰 Gibwork Escrow Released & Bounty Settled!`,
            `* **Task ID**: \`${taskId}\``,
            `* **Submission ID**: \`${submissionId}\``,
            `* **Contributor Rating**: ${'★'.repeat(rating)} (5/5)`,
            `* **Status**: ✅ **PAID & COMPLETED**`,
            ``,
            `*Settled seamlessly via [git-bounty](https://github.com/Blackwrld04/git-bounty).*`,
        ].join('\n');
        try {
            await github.addComment(pr.number, commentBody);
            commentSpinner.succeed('Receipt posted on GitHub PR!');
        }
        catch {
            commentSpinner.warn('Receipt posting skipped.');
        }
        // 4. Update local record
        recordBounty({
            taskId,
            issueNumber: getBountyRecord(taskId)?.issueNumber,
            title: pr.title,
            rewardAmount: opts.amount || '0',
            tokenMint: config.defaultToken,
            status: 'completed',
            createdAt: new Date().toISOString(),
            prNumber: pr.number,
            submissionId,
        });
        console.log(boxen(`${chalk.bold.hex('#14F195')('🏆 Bounty Settlement Complete!')}\n\n` +
            `The contributor has received their reward directly to their Solana wallet.`, { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }));
    }
    catch (error) {
        spinner.fail(chalk.red(`Settlement failed: ${error.message}`));
        process.exit(1);
    }
}
//# sourceMappingURL=settle.js.map