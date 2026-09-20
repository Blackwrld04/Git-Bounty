export interface ProofOfWorkBundle {
    taskId: string;
    issueNumber?: number;
    commitHash: string;
    branchName: string;
    prUrl?: string;
    gitDiffStat: string;
    testCommand: string;
    testPassed: boolean;
    testDurationMs: number;
    testOutputSummary: string;
    timestamp: string;
}
export interface BountyTaskSummary {
    taskId: string;
    title: string;
    content: string;
    rewardAmount: string;
    tokenMint: string;
    tokenSymbol: string;
    minSubmissionAmount?: string;
    perSubmissionAmount?: string;
    tags: string[];
    createdAt?: string;
    deadline?: string;
    creatorWallet?: string;
    submissionCount?: number;
}
export interface VerificationResult {
    passed: boolean;
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
    durationMs: number;
}
//# sourceMappingURL=bounty.d.ts.map