import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createGibworkClient, keypairFromPrivateKey } from '@gibwork/sdk/node';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { resolvePrivateKey, loadConfig } from './config.js';
export class GibworkService {
    client;
    keypair = null;
    isProduction;
    walletPublicKey = null;
    hasSigningKey = false;
    constructor(privateKeyOrFile, isProd) {
        const config = loadConfig();
        this.isProduction = isProd !== undefined ? isProd : config.network === 'production';
        const resolvedKey = privateKeyOrFile ? (privateKeyOrFile.startsWith('[') || privateKeyOrFile.length > 64
            ? privateKeyOrFile
            : resolvePrivateKey(privateKeyOrFile)) : resolvePrivateKey();
        if (resolvedKey) {
            try {
                this.keypair = keypairFromPrivateKey(resolvedKey);
                this.walletPublicKey = this.keypair.publicKey.toBase58();
                this.client = createGibworkClient({
                    privateKey: resolvedKey,
                    production: this.isProduction,
                    timeoutMs: 30000,
                });
                this.hasSigningKey = true;
            }
            catch (err) {
                this.client = null;
            }
        }
        if (!this.client) {
            // Create or read a stable discovery keypair from home cache to maintain session stability
            const cacheKeyPath = path.join(os.homedir(), '.gitbounty-session.json');
            let sessionKey;
            if (fs.existsSync(cacheKeyPath)) {
                try {
                    sessionKey = fs.readFileSync(cacheKeyPath, 'utf8').trim();
                }
                catch {
                    const kp = Keypair.generate();
                    sessionKey = JSON.stringify(Array.from(kp.secretKey));
                    fs.writeFileSync(cacheKeyPath, sessionKey, 'utf8');
                }
            }
            else {
                const kp = Keypair.generate();
                sessionKey = JSON.stringify(Array.from(kp.secretKey));
                try {
                    fs.writeFileSync(cacheKeyPath, sessionKey, 'utf8');
                }
                catch { }
            }
            this.client = createGibworkClient({
                privateKey: sessionKey,
                production: this.isProduction,
                timeoutMs: 30000,
            });
        }
    }
    /**
     * Ensures that a client with signing capability is available.
     */
    requireClient() {
        if (!this.client) {
            throw new Error('Wallet private key not configured. Provide SOLANA_PRIVATE_KEY or run with --keypair <path>.');
        }
        return this.client;
    }
    /**
     * Returns current wallet public key
     */
    getWalletAddress() {
        if (!this.walletPublicKey) {
            throw new Error('No Solana wallet configured.');
        }
        return this.walletPublicKey;
    }
    /**
     * Fetches SOL balance for configured wallet
     */
    async getWalletBalance(rpcUrl) {
        const address = this.getWalletAddress();
        const endpoint = rpcUrl || (this.isProduction
            ? 'https://api.mainnet-beta.solana.com'
            : 'https://api.devnet.solana.com');
        const connection = new Connection(endpoint, 'confirmed');
        const balanceLamports = await connection.getBalance(new PublicKey(address));
        return {
            sol: balanceLamports / LAMPORTS_PER_SOL,
            address,
        };
    }
    /**
     * Creates and funds an on-chain Gibwork task/bounty
     */
    async createTask(opts) {
        const client = this.requireClient();
        const config = loadConfig();
        const mintAddress = opts.tokenMint || config.defaultToken;
        const task = await client.tasks.create({
            title: opts.title,
            content: opts.content.startsWith('<') ? opts.content : `<p>${opts.content}</p>`,
            tags: opts.tags && opts.tags.length > 0 ? opts.tags : ['Bounty', 'OpenSource'],
            payment: {
                mintAddress,
                amount: opts.amount,
            },
            minSubmissionAmount: opts.minSubmissionAmount || opts.amount,
        });
        return task;
    }
    /**
     * Lists available public bounties
     */
    async listAvailableTasks(page = 1, limit = 20) {
        const response = await this.client.tasks.listAvailable({ page, limit });
        const rawList = Array.isArray(response)
            ? response
            : (response?.results || response?.tasks || response?.data || []);
        return rawList.map((t) => {
            const decimals = t.asset?.decimals ?? 6;
            let displayAmount = '0';
            // 1. Check direct USD bounty metric if provided by Gibwork API
            if (t.health?.metrics?.bountyUsd !== undefined && t.health.metrics.bountyUsd > 0) {
                displayAmount = String(t.health.metrics.bountyUsd);
            }
            else if (t.asset?.amount) {
                // 2. Compute total escrowed pool from asset base units
                const rawNum = Number(t.asset.amount);
                const calculated = rawNum / Math.pow(10, decimals);
                displayAmount = calculated % 1 === 0 ? calculated.toString() : calculated.toFixed(2);
            }
            else if (t.payment?.amount) {
                displayAmount = String(t.payment.amount);
            }
            else if (t.minSubmissionAmount) {
                displayAmount = String(t.minSubmissionAmount);
            }
            return {
                taskId: t.id || t.taskId,
                title: t.title || 'Untitled Bounty',
                content: t.content || '',
                rewardAmount: displayAmount,
                tokenMint: t.asset?.mintAddress || t.payment?.mintAddress || '',
                tokenSymbol: t.asset?.symbol || 'USDC',
                minSubmissionAmount: t.minSubmissionAmount ? String(t.minSubmissionAmount) : undefined,
                perSubmissionAmount: t.minSubmissionAmount ? String(t.minSubmissionAmount) : undefined,
                tags: t.tags || [],
                createdAt: t.createdAt,
                deadline: t.deadline,
                creatorWallet: t.creator?.address || t.creatorWallet,
                submissionCount: t.totalSubmissions || t.submissionCount || 0,
            };
        });
    }
    /**
     * Gets complete details for a single task
     */
    async getTask(taskId) {
        return await this.client.tasks.get(taskId);
    }
    /**
     * Submits proof of work to a task (signs 0.15 USDC fee)
     */
    async submitWork(opts) {
        const client = this.requireClient();
        const formattedContent = opts.content.startsWith('<') ? opts.content : `<p>${opts.content}</p>`;
        const intent = await client.submissions.create(opts.taskId, {
            content: formattedContent,
            idempotencyKey: opts.idempotencyKey,
        });
        return intent;
    }
    /**
     * Lists submissions for a task (creator only)
     */
    async listSubmissions(taskId) {
        const client = this.requireClient();
        return await client.submissions.list(taskId);
    }
    /**
     * Approves a submission and releases escrow payout to contributor
     */
    async approveSubmission(opts) {
        const client = this.requireClient();
        const payload = {};
        if (opts.amount)
            payload.amount = opts.amount;
        if (opts.rating)
            payload.rating = opts.rating;
        return await client.submissions.approve(opts.taskId, opts.submissionId, payload);
    }
    /**
     * Rejects a submission with feedback reason
     */
    async rejectSubmission(taskId, submissionId, reason) {
        const client = this.requireClient();
        return await client.submissions.reject(taskId, submissionId, reason);
    }
}
//# sourceMappingURL=gibwork.js.map