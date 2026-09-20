import { BountyTaskSummary } from '../types/bounty.js';
export interface CreateTaskOptions {
    title: string;
    content: string;
    amount: string;
    tokenMint?: string;
    tags?: string[];
    minSubmissionAmount?: string;
}
export interface CreateSubmissionOptions {
    taskId: string;
    content: string;
    idempotencyKey: string;
}
export interface ApproveSubmissionOptions {
    taskId: string;
    submissionId: string;
    amount?: string;
    rating?: number;
}
export declare class GibworkService {
    private client;
    private keypair;
    readonly isProduction: boolean;
    readonly walletPublicKey: string | null;
    readonly hasSigningKey: boolean;
    constructor(privateKeyOrFile?: string, isProd?: boolean);
    /**
     * Ensures that a client with signing capability is available.
     */
    private requireClient;
    /**
     * Returns current wallet public key
     */
    getWalletAddress(): string;
    /**
     * Fetches SOL balance for configured wallet
     */
    getWalletBalance(rpcUrl?: string): Promise<{
        sol: number;
        address: string;
    }>;
    /**
     * Creates and funds an on-chain Gibwork task/bounty
     */
    createTask(opts: CreateTaskOptions): Promise<any>;
    /**
     * Lists available public bounties
     */
    listAvailableTasks(page?: number, limit?: number): Promise<BountyTaskSummary[]>;
    /**
     * Gets complete details for a single task
     */
    getTask(taskId: string): Promise<any>;
    /**
     * Submits proof of work to a task (signs 0.15 USDC fee)
     */
    submitWork(opts: CreateSubmissionOptions): Promise<any>;
    /**
     * Lists submissions for a task (creator only)
     */
    listSubmissions(taskId: string): Promise<any>;
    /**
     * Approves a submission and releases escrow payout to contributor
     */
    approveSubmission(opts: ApproveSubmissionOptions): Promise<any>;
    /**
     * Rejects a submission with feedback reason
     */
    rejectSubmission(taskId: string, submissionId: string, reason: string): Promise<any>;
}
//# sourceMappingURL=gibwork.d.ts.map