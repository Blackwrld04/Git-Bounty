import { Command } from 'commander';
import { runInit } from './init.js';
import { runPost } from './post.js';
import { runBrowse } from './browse.js';
import { runClaim } from './claim.js';
import { runTest } from './test.js';
import { runSubmit } from './submit.js';
import { runReview } from './review.js';
import { runSettle } from './settle.js';
import { runWallet } from './wallet.js';
import { runDashboard } from './dashboard.js';
export function createProgram() {
    const program = new Command();
    program
        .name('git-bounty')
        .description('Native Git extension & CI/CD engine for Gibwork Solana bounties')
        .version('0.1.0');
    // init
    program
        .command('init')
        .description('Initialize .gitbounty.json for current repository')
        .option('--network <network>', 'Gibwork environment (stage | production)')
        .option('--token <mint>', 'Default reward token mint')
        .option('--test-cmd <cmd>', 'Automated verification test command')
        .option('-y, --yes', 'Non-interactive mode with default choices')
        .action(runInit);
    // post
    program
        .command('post <issue-number>')
        .description('Maintainer: Create and fund a Gibwork bounty from a GitHub issue')
        .requiredOption('-r, --reward <amount>', 'Reward payout amount (e.g. 50)')
        .option('-t, --token <symbol>', 'Reward token symbol (USDC, SOL)', 'USDC')
        .option('-k, --keypair <path>', 'Solana keypair file path')
        .option('--tags <tags>', 'Comma-separated tags')
        .option('--dry-run', 'Preview bounty parameters without signing transaction')
        .action(runPost);
    // browse
    program
        .command('browse')
        .description('Contributor: Discover active bounties across Gibwork')
        .option('--network <network>', 'Gibwork environment (stage | production)')
        .option('--min-reward <num>', 'Minimum reward amount')
        .option('--tag <tag>', 'Filter by tag')
        .option('--token <symbol>', 'Filter by token')
        .option('--page <page>', 'Pagination page number', '1')
        .option('--limit <limit>', 'Page size limit', '15')
        .option('--json', 'Output results as JSON')
        .action(runBrowse);
    // claim
    program
        .command('claim <identifier>')
        .description('Contributor: Claim a bounty, checkout a dedicated branch, and scaffold spec')
        .action(runClaim);
    // test
    program
        .command('test')
        .description('Contributor: Execute automated test suite to verify the bounty fix')
        .option('--cmd <cmd>', 'Override test execution command')
        .action(runTest);
    // submit
    program
        .command('submit')
        .description('Contributor: Package proof of work and submit deliverable to Gibwork')
        .option('--task <taskId>', 'Gibwork Task ID (auto-detected if omitted)')
        .option('--pr <url>', 'GitHub Pull Request URL')
        .option('-k, --keypair <path>', 'Solana keypair file path')
        .option('-y, --yes', 'Approve confirmation prompts automatically')
        .option('--skip-tests', 'Bypass test execution check')
        .option('--dry-run', 'Inspect proof of work bundle without broadcasting')
        .action(runSubmit);
    // review
    program
        .command('review <identifier>')
        .description('Maintainer: Review incoming submissions for a PR or task')
        .action(runReview);
    // settle
    program
        .command('settle <pr-number>')
        .description('Maintainer: Merge PR and release on-chain Solana escrow payment')
        .option('-s, --submission <submissionId>', 'Specific submission ID to approve')
        .option('-a, --amount <amount>', 'Custom payout amount')
        .option('--rating <rating>', 'Contributor rating (1-5)', '5')
        .option('--no-merge', 'Release payout without merging PR')
        .option('-k, --keypair <path>', 'Solana keypair file path')
        .option('-y, --yes', 'Bypass approval prompt')
        .action(runSettle);
    // wallet
    program
        .command('wallet')
        .description('Inspect configured Solana signing wallet and network health')
        .option('-k, --keypair <path>', 'Solana keypair file path')
        .option('--rpc <url>', 'Solana RPC endpoint override')
        .action(runWallet);
    // dashboard (TUI)
    program
        .command('dashboard')
        .alias('tui')
        .description('Launch interactive terminal user interface')
        .action(runDashboard);
    return program;
}
//# sourceMappingURL=index.js.map