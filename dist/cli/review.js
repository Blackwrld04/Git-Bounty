import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import { GitHubService } from '../core/github.js';
import { GibworkService } from '../core/gibwork.js';
import { loadConfig, getBountyRecord } from '../core/config.js';
import { GitService } from '../core/git.js';
export async function runReview(identifier) {
    const spinner = ora(`Fetching review data for "${identifier}"...`).start();
    try {
        const config = loadConfig();
        const git = new GitService();
        const repoSlug = config.repo || (await git.getGitHubRepoSlug()) || undefined;
        const github = new GitHubService(repoSlug);
        const gibwork = new GibworkService(undefined, config.network === 'production');
        let taskId;
        let prNumber;
        const numericId = parseInt(identifier, 10);
        if (!isNaN(numericId)) {
            prNumber = numericId;
            // Try to get PR details
            try {
                const pr = await github.getPullRequest(prNumber);
                spinner.text = `Inspecting PR #${pr.number}: "${pr.title}"...`;
                // Search for taskId in PR body or branch name
                const taskMatch = pr.body.match(/Task ID[:\s*`]+([0-9a-f-]{36})/i) ||
                    pr.headRefName.match(/([0-9a-f-]{36})/i);
                if (taskMatch) {
                    taskId = taskMatch[1];
                }
            }
            catch (err) {
                // May be an issue number
                const record = getBountyRecord(numericId);
                if (record) {
                    taskId = record.taskId;
                }
            }
        }
        else {
            taskId = identifier;
        }
        if (!taskId) {
            spinner.fail(`Could not link #${identifier} to an active Gibwork Task ID.`);
            console.log(chalk.gray('Please provide task ID explicitly: git bounty review <taskId>'));
            process.exit(1);
        }
        spinner.text = `Querying Gibwork API for Task ${taskId}...`;
        const submissions = await gibwork.listSubmissions(taskId);
        spinner.succeed(`Found ${submissions.length} submission(s) for task ${taskId}`);
        if (submissions.length === 0) {
            console.log(chalk.yellow('\nNo submissions have been received yet for this task.'));
            return;
        }
        console.log(boxen(`${chalk.bold.hex('#14F195')('📋 Gibwork Submissions Review')}\n` +
            `• Task ID: ${chalk.cyan(taskId)}\n` +
            `• Total Submissions: ${chalk.white.bold(submissions.length)}`, { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }));
        const table = new Table({
            head: [
                chalk.cyan('Submission ID'),
                chalk.cyan('Participant'),
                chalk.cyan('Status'),
                chalk.cyan('Preview'),
            ],
            colWidths: [20, 24, 14, 40],
            wordWrap: true,
        });
        for (const sub of submissions) {
            const contentSnippet = (sub.content || '')
                .replace(/<[^>]+>/g, '')
                .replace(/\n/g, ' ')
                .slice(0, 50);
            table.push([
                chalk.gray(sub.submissionId || sub.id || 'N/A'),
                chalk.white(sub.participantWallet || sub.author || 'Contributor'),
                chalk.yellow(sub.status || 'Pending'),
                chalk.gray(contentSnippet + '...'),
            ]);
        }
        console.log(table.toString());
        console.log(chalk.gray(`\nTo approve and release payout to a submission, run:\n` +
            `  ${chalk.cyan(`git bounty settle ${prNumber || '<pr-number>'} --submission <submissionId>`)}\n`));
    }
    catch (error) {
        spinner.fail(chalk.red(`Failed to review submissions: ${error.message}`));
        process.exit(1);
    }
}
//# sourceMappingURL=review.js.map