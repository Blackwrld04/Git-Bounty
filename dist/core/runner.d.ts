import { ProofOfWorkBundle, VerificationResult } from '../types/bounty.js';
export declare class TestRunner {
    private command;
    private cwd;
    constructor(command?: string, cwd?: string);
    /**
     * Executes the test command and captures outputs, duration, and exit code.
     */
    runTests(): Promise<VerificationResult>;
    /**
     * Generates a complete Proof-of-Work bundle combining git metrics with test verification.
     */
    generateProofOfWork(taskId: string, issueNumber?: number, prUrl?: string): Promise<{
        bundle: ProofOfWorkBundle;
        markdown: string;
    }>;
}
//# sourceMappingURL=runner.d.ts.map