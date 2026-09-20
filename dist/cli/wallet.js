import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { GibworkService } from '../core/gibwork.js';
import { loadConfig, resolvePrivateKey } from '../core/config.js';
export async function runWallet(opts = {}) {
    const config = loadConfig();
    const spinner = ora('Inspecting configured Solana wallet and network...').start();
    try {
        const rawKey = resolvePrivateKey(opts.keypair);
        if (!rawKey) {
            spinner.fail(chalk.red('No Solana wallet configured.'));
            console.log(boxen(`${chalk.bold.yellow('Wallet Setup Instructions')}\n\n` +
                `Configure a Solana keypair using one of the following methods:\n\n` +
                `1. Environment Variable:\n` +
                `   ${chalk.cyan('export SOLANA_PRIVATE_KEY="[1,2,3,...]"')}\n\n` +
                `2. Keypair File:\n` +
                `   ${chalk.cyan('export SOLANA_KEYPAIR_PATH="/path/to/keypair.json"')}\n\n` +
                `3. Standard Solana CLI keypair:\n` +
                `   ${chalk.cyan('solana-keygen new -o ~/.config/solana/id.json')}`, { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'yellow' }));
            return;
        }
        const gibwork = new GibworkService(rawKey, config.network === 'production');
        const address = gibwork.getWalletAddress();
        spinner.text = 'Querying on-chain balance from Solana RPC...';
        let balanceSol = 0;
        try {
            const balance = await gibwork.getWalletBalance(opts.rpc);
            balanceSol = balance.sol;
            spinner.succeed('Wallet verified on Solana network.');
        }
        catch {
            spinner.warn('Could not query RPC balance (network may be unreachable).');
        }
        const networkLabel = config.network === 'production'
            ? chalk.green.bold('Mainnet-Beta (Production)')
            : chalk.yellow.bold('Devnet / Testnet (Stage)');
        console.log(boxen(`${chalk.bold.hex('#14F195')('⚡ Solana Wallet Diagnostic')}\n\n` +
            `• Public Key: ${chalk.bold.white(address)}\n` +
            `• Network:    ${networkLabel}\n` +
            `• SOL Balance: ${balanceSol > 0 ? chalk.green.bold(balanceSol.toFixed(4) + ' SOL') : chalk.red('0.0000 SOL (Needs SOL for gas)')}\n` +
            `• Config File: ${chalk.gray(config.network)}\n` +
            `• Environment: ${chalk.cyan(config.network.toUpperCase())}`, { padding: 1, margin: { top: 1, bottom: 1 }, borderStyle: 'round', borderColor: 'green' }));
        if (balanceSol === 0 && config.network === 'stage') {
            console.log(chalk.gray(`Tip: Request Devnet SOL for testing with: ${chalk.cyan(`solana airdrop 1 ${address} --url devnet`)}\n`));
        }
    }
    catch (error) {
        spinner.fail(chalk.red(`Wallet check failed: ${error.message}`));
        process.exit(1);
    }
}
//# sourceMappingURL=wallet.js.map