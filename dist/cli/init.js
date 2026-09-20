import chalk from 'chalk';
import boxen from 'boxen';
import prompts from 'prompts';
import { GitService } from '../core/git.js';
import { loadConfig, saveConfig, getConfigPath } from '../core/config.js';
import { KNOWN_TOKENS } from '../types/config.js';
export async function runInit(opts = {}) {
    const git = new GitService();
    const isRepo = await git.isGitRepo();
    if (!isRepo) {
        console.error(chalk.red('✖ Error: Current directory is not a Git repository.'));
        process.exit(1);
    }
    const detectedSlug = await git.getGitHubRepoSlug();
    const existingConfig = loadConfig();
    console.log(boxen(`${chalk.bold.hex('#14F195')('⚡ git-bounty Initialization')}\n` +
        `${chalk.gray('Configure your repository for Gibwork Solana bounties')}`, { padding: 1, margin: 0, borderStyle: 'round', borderColor: 'green' }));
    let repo = detectedSlug || existingConfig.repo || '';
    let network = opts.network || existingConfig.network || 'stage';
    let testCommand = opts.testCmd || existingConfig.testCommand || 'npm test';
    let defaultToken = existingConfig.defaultToken || KNOWN_TOKENS.USDC.mint;
    if (!opts.yes) {
        const answers = await prompts([
            {
                type: 'text',
                name: 'repo',
                message: 'GitHub repository (owner/repo):',
                initial: repo,
            },
            {
                type: 'select',
                name: 'network',
                message: 'Gibwork API environment:',
                choices: [
                    { title: 'Stage (Devnet / Testing)', value: 'stage' },
                    { title: 'Production (Mainnet-Beta)', value: 'production' },
                ],
                initial: network === 'production' ? 1 : 0,
            },
            {
                type: 'text',
                name: 'testCommand',
                message: 'Automated verification test command:',
                initial: testCommand,
            },
        ]);
        if (!answers.network) {
            console.log(chalk.yellow('\nInitialization cancelled.'));
            return;
        }
        repo = answers.repo;
        network = answers.network;
        testCommand = answers.testCommand;
    }
    const newConfig = {
        ...existingConfig,
        repo: repo || undefined,
        network,
        testCommand,
        defaultToken,
        defaultTokenSymbol: 'USDC',
    };
    saveConfig(newConfig);
    console.log(chalk.green(`\n✔ Configuration saved to ${chalk.bold(getConfigPath())}`));
    console.log(`\nNext steps:`);
    console.log(`  1. Create a bounty:   ${chalk.cyan('git bounty post <issue-number> --reward 25')}`);
    console.log(`  2. Browse bounties:   ${chalk.cyan('git bounty browse')}`);
    console.log(`  3. Check your wallet: ${chalk.cyan('git bounty wallet')}\n`);
}
//# sourceMappingURL=init.js.map