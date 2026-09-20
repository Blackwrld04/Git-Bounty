import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import prompts from 'prompts';
import { v4 as uuidv4 } from 'uuid';
import { GitService } from '../core/git.js';
import { GibworkService } from '../core/gibwork.js';
import { TestRunner } from '../core/runner.js';
import { loadConfig, recordBounty, findGitRoot } from '../core/config.js';

export interface SubmitOptions {
  task?: string;
  pr?: string;
  keypair?: string;
  yes?: boolean;
  skipTests?: boolean;
  dryRun?: boolean;
}

export async function runSubmit(opts: SubmitOptions = {}) {
  const git = new GitService();
  const config = loadConfig();

  const isClean = await git.isClean();
  if (!isClean) {
    console.warn(chalk.yellow('\n⚠ Warning: You have uncommitted changes in your working tree.'));
    console.warn(chalk.gray('It is strongly recommended to commit all changes before submitting proof-of-work.\n'));
  }

  let taskId = opts.task;
  let issueNumber: number | undefined;

  // Attempt auto-detection of task from current branch or .bounty/SPEC.md
  if (!taskId) {
    const currentBranch = await git.getCurrentBranch();
    const specPath = path.join(findGitRoot(), '.bounty', 'SPEC.md');

    if (fs.existsSync(specPath)) {
      const specContent = fs.readFileSync(specPath, 'utf8');
      const taskMatch = specContent.match(/\* \*\*Task ID\*\*:\s*`([^`]+)`/);
      if (taskMatch && taskMatch[1] && taskMatch[1] !== 'Pending') {
        taskId = taskMatch[1];
      }
      const issueMatch = specContent.match(/\* \*\*GitHub Issue\*\*:\s*#(\d+)/);
      if (issueMatch && issueMatch[1]) {
        issueNumber = parseInt(issueMatch[1], 10);
      }
    }

    if (!taskId) {
      // Search config bounties for matching branch
      for (const b of Object.values(config.bounties)) {
        if (b.branchName === currentBranch) {
          taskId = b.taskId;
          issueNumber = b.issueNumber;
          break;
        }
      }
    }
  }

  if (!taskId) {
    console.error(chalk.red('✖ Error: Could not determine Gibwork Task ID for submission.'));
    console.error(chalk.gray('Please specify explicitly: git bounty submit --task <taskId>'));
    process.exit(1);
  }

  console.log(
    boxen(
      `${chalk.bold.hex('#14F195')('⚡ Packaging Gibwork Bounty Submission')}\n` +
      `• Task ID: ${chalk.cyan(taskId)}\n` +
      (issueNumber ? `• Linked Issue: #${issueNumber}\n` : '') +
      `• Network: ${chalk.white.bold(config.network.toUpperCase())}`,
      { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }
    )
  );

  // Run tests and generate PoW
  const runner = new TestRunner(config.testCommand);
  const testSpinner = ora(`Running automated verification (${config.testCommand})...`).start();

  let testPassed = true;
  if (!opts.skipTests) {
    const testResult = await runner.runTests();
    if (!testResult.passed) {
      testSpinner.fail(chalk.red('Verification tests failed! Cannot submit unverified code.'));
      console.log(chalk.red(testResult.stderr || testResult.stdout));
      process.exit(1);
    }
    testSpinner.succeed(`Tests passed in ${testResult.durationMs}ms`);
  } else {
    testSpinner.info('Skipping test execution as requested (--skip-tests)');
  }

  const { bundle, markdown } = await runner.generateProofOfWork(taskId, issueNumber, opts.pr);

  console.log(chalk.bold('\nProof-of-Work Summary:'));
  console.log(`  • Commit:  ${chalk.cyan(bundle.commitHash)}`);
  console.log(`  • Changes: ${chalk.gray(bundle.gitDiffStat)}`);
  console.log(`  • Status:  ${chalk.green('PASSED')}`);

  if (opts.dryRun) {
    console.log(chalk.yellow('\n[Dry Run] PoW Payload:'));
    console.log(markdown);
    return;
  }

  // Participation fee warning
  console.log(chalk.gray('\nNote: Gibwork protocol requires a 0.15 USDC participation fee to prevent spam.'));

  if (!opts.yes) {
    const confirm = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: 'Sign transaction and submit proof-of-work to Gibwork?',
      initial: true,
    });

    if (!confirm.proceed) {
      console.log(chalk.yellow('Submission aborted.'));
      return;
    }
  }

  const submitSpinner = ora('Signing and dispatching submission to Solana...').start();

  try {
    const gibwork = new GibworkService(opts.keypair, config.network === 'production');
    const idempotencyKey = uuidv4();

    const intent = await gibwork.submitWork({
      taskId,
      content: markdown,
      idempotencyKey,
    });

    submitSpinner.succeed(chalk.green.bold('Proof of work submitted successfully!'));

    // Record submission
    recordBounty({
      taskId,
      issueNumber,
      title: `Submission for ${taskId.slice(0, 8)}`,
      rewardAmount: '0',
      tokenMint: config.defaultToken,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      submissionId: intent.submissionId || intent.intentId || idempotencyKey,
    });

    console.log(
      boxen(
        `${chalk.bold.hex('#14F195')('🎉 Submission Recorded on Gibwork!')}\n\n` +
        `• Task ID: ${chalk.white(taskId)}\n` +
        `• Intent ID: ${chalk.cyan(intent.intentId || 'Confirmed')}\n` +
        `• Status: ${chalk.green.bold(intent.status || 'Fulfilled')}\n\n` +
        `The repository maintainer will review your submission and merge your PR to release the Solana escrow.`,
        { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }
      )
    );
  } catch (error: any) {
    submitSpinner.fail(chalk.red(`Submission failed: ${error.message}`));
    process.exit(1);
  }
}
