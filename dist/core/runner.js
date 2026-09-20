import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { GitService } from './git.js';
const execAsync = promisify(exec);
export class TestRunner {
    command;
    cwd;
    constructor(command = 'npm test', cwd = process.cwd()) {
        this.command = command;
        this.cwd = cwd;
    }
    /**
     * Executes the test command and captures outputs, duration, and exit code.
     */
    async runTests() {
        const startTime = Date.now();
        try {
            const { stdout, stderr } = await execAsync(this.command, { cwd: this.cwd });
            const durationMs = Date.now() - startTime;
            return {
                passed: true,
                command: this.command,
                exitCode: 0,
                stdout,
                stderr,
                durationMs,
            };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            return {
                passed: false,
                command: this.command,
                exitCode: error.code || 1,
                stdout: error.stdout || '',
                stderr: error.stderr || error.message || '',
                durationMs,
            };
        }
    }
    /**
     * Generates a complete Proof-of-Work bundle combining git metrics with test verification.
     */
    async generateProofOfWork(taskId, issueNumber, prUrl) {
        const git = new GitService(this.cwd);
        const branchName = await git.getCurrentBranch();
        const commitHash = await git.getLatestCommitHash(true);
        const diffStat = await git.getDiffStat();
        const testResult = await this.runTests();
        const bundle = {
            taskId,
            issueNumber,
            commitHash,
            branchName,
            prUrl,
            gitDiffStat: diffStat,
            testCommand: this.command,
            testPassed: testResult.passed,
            testDurationMs: testResult.durationMs,
            testOutputSummary: testResult.passed
                ? 'All test suites completed successfully.'
                : `Tests failed with code ${testResult.exitCode}`,
            timestamp: new Date().toISOString(),
        };
        const markdown = [
            `### ⚡ Gibwork Bounty Submission`,
            `* **Task ID**: \`${taskId}\``,
            issueNumber ? `* **GitHub Issue**: #${issueNumber}` : '',
            prUrl ? `* **Pull Request**: ${prUrl}` : '',
            `* **Branch**: \`${branchName}\``,
            `* **Commit**: \`${commitHash}\``,
            `* **Changes**: \`${diffStat}\``,
            `* **Automated Verification**: ${testResult.passed ? '✅ PASSED' : '❌ FAILED'} (\`${this.command}\` in ${testResult.durationMs}ms)`,
            ``,
            `#### Verification Logs`,
            `\`\`\`text`,
            (testResult.stdout || testResult.stderr || 'No output recorded').trim().slice(-1200),
            `\`\`\``,
        ]
            .filter(Boolean)
            .join('\n');
        return { bundle, markdown };
    }
}
//# sourceMappingURL=runner.js.map