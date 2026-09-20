import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { GibworkService } from '../core/gibwork.js';
import { GitHubService } from '../core/github.js';
import { GitService } from '../core/git.js';
import { loadConfig, recordBounty } from '../core/config.js';
import { KNOWN_TOKENS } from '../types/config.js';

export interface PostOptions {
  reward: string;
  token?: string;
  keypair?: string;
  tags?: string;
  dryRun?: boolean;
}

export async function runPost(issueNumberStr: string, opts: PostOptions) {
  const issueNumber = parseInt(issueNumberStr, 10);
  if (isNaN(issueNumber)) {
    console.error(chalk.red('✖ Error: Invalid GitHub issue number. Provide an integer like: git bounty post 42 --reward 50'));
    process.exit(1);
  }

  if (!opts.reward) {
    console.error(chalk.red('✖ Error: Reward amount is required. Example: --reward 25'));
    process.exit(1);
  }

  const spinner = ora('Reading repository and GitHub issue details...').start();

  try {
    const config = loadConfig();
    const git = new GitService();
    const repoSlug = config.repo || (await git.getGitHubRepoSlug()) || undefined;

    const github = new GitHubService(repoSlug);
    const issue = await github.getIssue(issueNumber);

    spinner.succeed(`Found GitHub Issue #${issue.number}: "${chalk.bold(issue.title)}"`);

    // Parse token and reward
    const tokenSymbol = opts.token ? opts.token.toUpperCase() : config.defaultTokenSymbol;
    const tokenMint = KNOWN_TOKENS[tokenSymbol]?.mint || config.defaultToken;
    const tags = opts.tags ? opts.tags.split(',').map(t => t.trim()) : ['GitHub', 'Bounty', ...issue.labels];

    console.log(
      boxen(
        `${chalk.bold.hex('#14F195')('Bounty Parameters')}\n` +
        `• Title: ${chalk.white(issue.title)}\n` +
        `• Reward: ${chalk.bold.green(opts.reward + ' ' + tokenSymbol)}\n` +
        `• Network: ${chalk.cyan(config.network.toUpperCase())}\n` +
        `• Mint: ${chalk.gray(tokenMint)}`,
        { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }
      )
    );

    if (opts.dryRun) {
      console.log(chalk.yellow('ℹ Dry-run mode enabled: On-chain escrow creation skipped.'));
      return;
    }

    const gibwork = new GibworkService(opts.keypair, config.network === 'production');
    
    // Check wallet balance
    const walletSpinner = ora('Validating Solana signing wallet...').start();
    try {
      const balance = await gibwork.getWalletBalance();
      walletSpinner.succeed(`Signer Wallet: ${chalk.cyan(balance.address)} (Balance: ${balance.sol.toFixed(4)} SOL)`);
    } catch {
      walletSpinner.warn('Wallet balance check skipped; attempting escrow creation...');
    }

    const createSpinner = ora('Creating and funding on-chain Gibwork escrow...').start();

    // Content formatted with issue reference
    const htmlContent = `
      <h3>${issue.title}</h3>
      <p>Original GitHub Issue: <a href="${issue.url}">${issue.url}</a></p>
      <hr />
      <div>${issue.body ? issue.body.replace(/\n/g, '<br/>') : 'No description provided.'}</div>
    `;

    const task = await gibwork.createTask({
      title: issue.title,
      content: htmlContent,
      amount: opts.reward,
      tokenMint,
      tags,
    });

    const taskId = task.taskId || task.id;
    createSpinner.succeed(chalk.green.bold(`Escrow funded on Solana! Task ID: ${taskId}`));

    // Record in local .gitbounty.json
    recordBounty({
      taskId,
      issueNumber,
      title: issue.title,
      rewardAmount: opts.reward,
      tokenMint,
      status: 'open',
      createdAt: new Date().toISOString(),
    });

    // Notify GitHub issue
    const ghSpinner = ora('Updating GitHub issue with escrow status & claim commands...').start();
    const commentMarkdown = [
      `### ⚡ Gibwork Bounty Funded!`,
      `* **Reward**: \`${opts.reward} ${tokenSymbol}\``,
      `* **Task ID**: \`${taskId}\``,
      `* **Network**: \`${config.network.toUpperCase()}\``,
      ``,
      `#### 🚀 How to Claim & Work on this Bounty:`,
      `1. Run in your terminal:`,
      `   \`\`\`bash`,
      `   git bounty claim ${issueNumber}`,
      `   \`\`\``,
      `2. Implement the fix, run tests, and submit your verified proof of work:`,
      `   \`\`\`bash`,
      `   git bounty test`,
      `   git bounty submit`,
      `   \`\`\``,
    ].join('\n');

    try {
      await github.addComment(issueNumber, commentMarkdown);
      await github.addLabel(issueNumber, `bounty: ${opts.reward} ${tokenSymbol}`);
      ghSpinner.succeed('GitHub issue updated with comment & bounty label!');
    } catch (ghErr: any) {
      ghSpinner.warn(`GitHub update note: ${ghErr.message}`);
    }

    console.log(chalk.bold.hex('#14F195')(`\n✨ Bounty successfully live on Gibwork!`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to post bounty: ${error.message}`));
    process.exit(1);
  }
}
