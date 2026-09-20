import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { GitService } from '../core/git.js';
import { GibworkService } from '../core/gibwork.js';
import { GitHubService } from '../core/github.js';
import { loadConfig, getBountyRecord, recordBounty, findGitRoot } from '../core/config.js';
import { htmlToMarkdown, formatDate } from '../core/format.js';

export async function runClaim(identifier: string) {
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
    let taskDetails: any = null;

    const gibwork = new GibworkService(undefined, config.network === 'production');

    // If identifier is a pure number (no hyphens or hex characters), try GitHub issue lookup
    const isPureDigits = /^\d+$/.test(identifier.trim());
    if (!record && isPureDigits) {
      issueNumber = parseInt(identifier.trim(), 10);
      const repoSlug = config.repo || (await git.getGitHubRepoSlug()) || undefined;
      const gh = new GitHubService(repoSlug);
      try {
        const issue = await gh.getIssue(issueNumber);
        title = issue.title;
      } catch {}
    } else {
      taskId = record ? record.taskId : identifier;
      try {
        taskDetails = await gibwork.getTask(taskId);
        title = taskDetails.title || 'Gibwork Bounty';
        if (taskDetails.health?.metrics?.bountyUsd) {
          reward = String(taskDetails.health.metrics.bountyUsd);
        } else if (taskDetails.asset?.amount) {
          const dec = taskDetails.asset?.decimals ?? 6;
          const calc = Number(taskDetails.asset.amount) / Math.pow(10, dec);
          reward = calc % 1 === 0 ? calc.toString() : calc.toFixed(2);
        } else if (taskDetails.payment?.amount) {
          reward = String(taskDetails.payment.amount);
        }
      } catch (err: any) {
        if (!record) {
          spinner.fail(`Could not find task on Gibwork: ${err.message}`);
          process.exit(1);
        }
      }
    }

    spinner.succeed(`Identified bounty: "${chalk.bold(title || identifier)}"`);

    const tokenSymbol = taskDetails?.asset?.symbol || config.defaultTokenSymbol || 'USDC';
    const perSub = taskDetails?.minSubmissionAmount ? String(taskDetails.minSubmissionAmount) : '-';
    const creator = taskDetails?.user?.username || taskDetails?.creator?.address?.slice(0, 10) || 'Maintainer';
    const creatorRating = taskDetails?.user?.rating ? `(${taskDetails.user.rating}% rating)` : '';
    const deadlineStr = formatDate(taskDetails?.deadline);
    const tagsStr = (taskDetails?.tags || []).join(', ') || 'Development';
    const descriptionMd = htmlToMarkdown(taskDetails?.content);
    const requirementsMd = htmlToMarkdown(taskDetails?.requirements);

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
      `# ⚡ Bounty Specification: ${title || identifier}`,
      ``,
      `## 📊 Overview`,
      `* **Task ID**: \`${taskId || 'Pending'}\``,
      issueNumber ? `* **GitHub Issue**: #${issueNumber}` : '',
      `* **Bounty Pool**: **${reward} ${tokenSymbol}**`,
      taskDetails?.minSubmissionAmount ? `* **Payout Per Approved Submission**: ${perSub} ${tokenSymbol}` : '',
      `* **Creator / Sponsor**: ${creator} ${creatorRating}`,
      `* **Deadline**: ${deadlineStr}`,
      `* **Tags**: ${tagsStr}`,
      `* **Active Git Branch**: \`${branchName}\``,
      `* **Status**: In Progress`,
      ``,
      `---`,
      ``,
      `## 📝 Description & Instructions`,
      descriptionMd || 'No description provided.',
      ``,
      requirementsMd && requirementsMd !== 'Provide a detailed description of your submission and all required deliverables.'
        ? `## 🎯 Specific Requirements\n${requirementsMd}\n`
        : '',
      `---`,
      ``,
      `## ✅ Deliverables Checklist`,
      `- [ ] Review instructions and criteria above.`,
      `- [ ] Implement required code changes or deliverables.`,
      `- [ ] Run tests: \`git bounty test\` (Must pass with 0 errors).`,
      `- [ ] Commit your changes to git branch: \`${branchName}\`.`,
      `- [ ] Submit proof-of-work: \`git bounty submit\`.`,
      ``,
      `---`,
      ``,
      `## 🚀 Workflow Commands`,
      `* **Run verification test**: \`git bounty test\``,
      `* **Inspect details anytime**: \`git bounty show ${taskId}\``,
      `* **Submit proof of work**: \`git bounty submit\``,
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
      tokenMint: taskDetails?.asset?.mintAddress || config.defaultToken,
      status: 'in_progress',
      createdAt: record?.createdAt || new Date().toISOString(),
      branchName,
    });

    const summaryBanner = [
      `${chalk.bold.hex('#14F195')('🎯 Bounty Claimed Successfully!')}`,
      ``,
      `• Title:        ${chalk.bold.white(title)}`,
      `• Task ID:      ${chalk.cyan(taskId)}`,
      `• Bounty Pool:  ${chalk.bold.green(reward + ' ' + tokenSymbol)}`,
      perSub !== '-' ? `• Payout / Sub: ${chalk.yellow(perSub + ' ' + tokenSymbol)}` : '',
      `• Creator:      ${chalk.white(creator)} ${chalk.gray(creatorRating)}`,
      `• Deadline:     ${chalk.magenta(deadlineStr)}`,
      `• Active Branch: ${chalk.bold.cyan(branchName)}`,
      `• Spec File:    ${chalk.gray('.bounty/SPEC.md')}`,
    ]
      .filter(Boolean)
      .join('\n');

    console.log(boxen(summaryBanner, { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }));

    if (descriptionMd) {
      console.log(chalk.bold.white('📋 Task Instructions:'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(descriptionMd.slice(0, 600) + (descriptionMd.length > 600 ? chalk.gray('\n...(Full description in .bounty/SPEC.md)') : ''));
      console.log(chalk.gray('─'.repeat(60)));
    }

    console.log(`\nNext Steps:`);
    console.log(`  1. Open ${chalk.cyan('.bounty/SPEC.md')} for the full specification & deliverable checklist.`);
    console.log(`  2. Implement your work and run: ${chalk.cyan('git bounty test')}`);
    console.log(`  3. Package and submit:           ${chalk.cyan('git bounty submit')}\n`);
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to claim bounty: ${error.message}`));
    process.exit(1);
  }
}
