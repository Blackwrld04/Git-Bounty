import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { GibworkService } from '../core/gibwork.js';
import { loadConfig } from '../core/config.js';

export interface BrowseOptions {
  minReward?: string;
  tag?: string;
  token?: string;
  page?: string;
  limit?: string;
  json?: boolean;
}

export async function runBrowse(opts: BrowseOptions = {}) {
  const config = loadConfig();
  const spinner = ora(`Fetching active bounties from Gibwork (${config.network.toUpperCase()})...`).start();

  try {
    const gibwork = new GibworkService(undefined, config.network === 'production');
    const page = opts.page ? parseInt(opts.page, 10) : 1;
    const limit = opts.limit ? parseInt(opts.limit, 10) : 15;

    let tasks = await gibwork.listAvailableTasks(page, limit);

    // Apply client-side filters
    if (opts.minReward) {
      const min = parseFloat(opts.minReward);
      tasks = tasks.filter(t => parseFloat(t.rewardAmount) >= min);
    }

    if (opts.tag) {
      const lowerTag = opts.tag.toLowerCase();
      tasks = tasks.filter(t => t.tags.some(tag => tag.toLowerCase().includes(lowerTag)));
    }

    if (opts.token) {
      const lowerToken = opts.token.toLowerCase();
      tasks = tasks.filter(t => t.tokenSymbol.toLowerCase() === lowerToken);
    }

    spinner.stop();

    if (opts.json) {
      console.log(JSON.stringify(tasks, null, 2));
      return;
    }

    if (tasks.length === 0) {
      console.log(chalk.yellow('\nNo active bounties matched your criteria.'));
      return;
    }

    console.log(chalk.bold.hex('#14F195')(`\n⚡ Available Gibwork Bounties (${tasks.length} found)\n`));

    const table = new Table({
      head: [
        chalk.cyan('Task ID'),
        chalk.cyan('Title'),
        chalk.cyan('Reward'),
        chalk.cyan('Token'),
        chalk.cyan('Tags'),
      ],
      colWidths: [38, 35, 12, 10, 20],
      wordWrap: true,
    });

    for (const t of tasks) {
      table.push([
        chalk.gray(t.taskId),
        chalk.white.bold(t.title.length > 32 ? t.title.slice(0, 30) + '...' : t.title),
        chalk.green.bold(t.rewardAmount),
        chalk.yellow(t.tokenSymbol),
        chalk.magenta(t.tags.slice(0, 3).join(', ')),
      ]);
    }

    console.log(table.toString());
    console.log(chalk.gray(`\nTo claim and work on any task, run: ${chalk.cyan('git bounty claim <taskId>')}\n`));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to fetch bounties: ${error.message}`));
    process.exit(1);
  }
}
