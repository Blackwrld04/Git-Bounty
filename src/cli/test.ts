import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { TestRunner } from '../core/runner.js';
import { loadConfig } from '../core/config.js';

export interface TestOptions {
  cmd?: string;
}

export async function runTest(opts: TestOptions = {}) {
  const config = loadConfig();
  const testCommand = opts.cmd || config.testCommand || 'npm test';

  console.log(chalk.bold.hex('#14F195')(`\n⚡ Running Bounty Verification Test Suite\n`));
  console.log(chalk.gray(`Command: ${chalk.white.bold(testCommand)}\n`));

  const spinner = ora('Executing test runner...').start();
  const runner = new TestRunner(testCommand);

  const result = await runner.runTests();

  if (result.passed) {
    spinner.succeed(chalk.green.bold(`All tests passed in ${result.durationMs}ms!`));
    if (result.stdout) {
      console.log(chalk.gray('\nTest Output:'));
      console.log(result.stdout.slice(-800));
    }

    console.log(
      boxen(
        `${chalk.green.bold('✔ VERIFICATION PASSED')}\n\n` +
        `Your code changes satisfy the automated test requirements.\n` +
        `Run ${chalk.cyan.bold('git bounty submit')} to submit your proof of work.`,
        { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }
      )
    );
  } else {
    spinner.fail(chalk.red.bold(`Tests failed with exit code ${result.exitCode} (${result.durationMs}ms)`));
    if (result.stderr || result.stdout) {
      console.log(chalk.red('\nError Details:'));
      console.log(chalk.red(result.stderr || result.stdout));
    }

    console.log(
      boxen(
        `${chalk.red.bold('✖ VERIFICATION FAILED')}\n\n` +
        `Please fix failing tests before submitting to Gibwork.`,
        { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'red' }
      )
    );
    process.exit(1);
  }
}
