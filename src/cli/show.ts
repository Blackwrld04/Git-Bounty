import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { GibworkService } from '../core/gibwork.js';
import { GitHubService } from '../core/github.js';
import { loadConfig, getBountyRecord } from '../core/config.js';
import { htmlToMarkdown, formatDate } from '../core/format.js';

export async function runShow(identifier: string) {
  const spinner = ora(`Fetching details for bounty "${identifier}"...`).start();

  try {
    const config = loadConfig();
    const gibwork = new GibworkService(undefined, config.network === 'production');

    let taskId = identifier;
    let issueNumber: number | undefined;

    // Check local records
    const record = getBountyRecord(identifier);
    if (record) {
      taskId = record.taskId;
      issueNumber = record.issueNumber;
    } else if (/^\d+$/.test(identifier.trim())) {
      issueNumber = parseInt(identifier.trim(), 10);
      const gh = new GitHubService(config.repo);
      const issue = await gh.getIssue(issueNumber);
      spinner.succeed(`Found GitHub Issue #${issue.number}: "${chalk.bold(issue.title)}"`);

      console.log(
        boxen(
          `${chalk.bold.hex('#14F195')('📌 GitHub Issue #' + issue.number + ': ' + issue.title)}\n\n` +
          `• Author: ${chalk.cyan(issue.author)}\n` +
          `• URL:    ${chalk.gray(issue.url)}\n` +
          `• Labels: ${chalk.magenta(issue.labels.join(', ') || 'None')}\n\n` +
          `${chalk.bold('Description:')}\n${issue.body || 'No description provided.'}\n\n` +
          `To fund as a Gibwork bounty: ${chalk.cyan(`git bounty post ${issue.number} --reward <amount>`)}`,
          { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
        )
      );
      return;
    }

    const task = await gibwork.getTask(taskId);
    spinner.stop();

    // Determine rewards
    const decimals = task.asset?.decimals ?? 6;
    let poolAmount = '0';
    if (task.health?.metrics?.bountyUsd) {
      poolAmount = String(task.health.metrics.bountyUsd);
    } else if (task.asset?.amount) {
      const calc = Number(task.asset.amount) / Math.pow(10, decimals);
      poolAmount = calc % 1 === 0 ? calc.toString() : calc.toFixed(2);
    } else if (task.payment?.amount) {
      poolAmount = String(task.payment.amount);
    }

    const tokenSymbol = task.asset?.symbol || 'USDC';
    const perSub = task.minSubmissionAmount ? String(task.minSubmissionAmount) : '-';
    const creator = task.user?.username || task.creator?.address?.slice(0, 10) || 'Anonymous';
    const creatorRating = task.user?.rating ? `(${task.user.rating}% rating)` : '';
    const deadlineStr = formatDate(task.deadline);
    const tagsStr = (task.tags || []).join(', ') || 'General';

    const descriptionMarkdown = htmlToMarkdown(task.content);
    const requirementsMarkdown = htmlToMarkdown(task.requirements);

    const banner = [
      `${chalk.bold.hex('#14F195')('⚡ ' + task.title)}`,
      ``,
      `• Task ID:     ${chalk.cyan(task.id)}`,
      `• Bounty Pool: ${chalk.bold.green(poolAmount + ' ' + tokenSymbol)}${task.asset?.price ? chalk.gray(` (~$${task.asset.price})`) : ''}`,
      `• Payout/Sub:  ${chalk.yellow(perSub + ' ' + tokenSymbol)}`,
      `• Creator:     ${chalk.white(creator)} ${chalk.gray(creatorRating)}`,
      `• Deadline:    ${chalk.magenta(deadlineStr)}`,
      `• Submissions: ${chalk.cyan(task.taskSubmissionsPendingCount || 0)} pending / ${chalk.green(task.taskSubmissionsApprovedCount || 0)} approved`,
      `• Tags:        ${chalk.gray(tagsStr)}`,
      `• Network:     ${chalk.white.bold(config.network.toUpperCase())}`,
    ].join('\n');

    console.log(boxen(banner, { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }));

    if (descriptionMarkdown) {
      console.log(chalk.bold.white('\n📋 Task Description & Instructions:'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(descriptionMarkdown);
      console.log(chalk.gray('─'.repeat(60)));
    }

    if (requirementsMarkdown && requirementsMarkdown !== 'Provide a detailed description of your submission and all required deliverables.') {
      console.log(chalk.bold.white('\n🎯 Specific Deliverables & Requirements:'));
      console.log(chalk.gray('─'.repeat(60)));
      console.log(requirementsMarkdown);
      console.log(chalk.gray('─'.repeat(60)));
    }

    console.log(`\nNext Actions:`);
    console.log(`  • Claim and start working: ${chalk.cyan(`git bounty claim ${task.id}`)}`);
    console.log(`  • Test your fix locally:   ${chalk.cyan(`git bounty test`)}`);
    console.log(`  • Submit completed work:   ${chalk.cyan(`git bounty submit --task ${task.id}`)}\n`);
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to fetch bounty details: ${error.message}`));
    process.exit(1);
  }
}
