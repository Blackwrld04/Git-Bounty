import { describe, it, expect } from 'vitest';
import { GitService } from '../src/core/git.js';
import { loadConfig, saveConfig, recordBounty, getBountyRecord } from '../src/core/config.js';
import { TestRunner } from '../src/core/runner.js';
import { GibworkService } from '../src/core/gibwork.js';

describe('git-bounty Core Test Suite', () => {
  describe('GitService', () => {
    const git = new GitService();

    it('should detect that workspace is a valid Git repository', async () => {
      const isRepo = await git.isGitRepo();
      expect(isRepo).toBe(true);
    });

    it('should get current active branch', async () => {
      const branch = await git.getCurrentBranch();
      expect(branch).toBeDefined();
      expect(typeof branch).toBe('string');
    });

    it('should get latest commit hash', async () => {
      const hash = await git.getLatestCommitHash(true);
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThanOrEqual(7);
    });

    it('should calculate git diff stats', async () => {
      const diffStat = await git.getDiffStat();
      expect(diffStat).toBeDefined();
      expect(typeof diffStat).toBe('string');
    });
  });

  describe('Config Management', () => {
    it('should load default configuration if missing or valid', () => {
      const config = loadConfig();
      expect(config.version).toBe('1');
      expect(config.defaultTokenSymbol).toBe('USDC');
      expect(['stage', 'production']).toContain(config.network);
    });

    it('should record and lookup bounty records by ID or issue number', () => {
      const testBounty = {
        taskId: 'test-uuid-999',
        issueNumber: 99,
        title: 'Fix edge case in Solana deserializer',
        rewardAmount: '75',
        tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        status: 'open' as const,
        createdAt: new Date().toISOString(),
      };

      recordBounty(testBounty);

      const byIssue = getBountyRecord(99);
      expect(byIssue).toBeDefined();
      expect(byIssue?.title).toBe('Fix edge case in Solana deserializer');

      const byTaskId = getBountyRecord('test-uuid-999');
      expect(byTaskId).toBeDefined();
      expect(byTaskId?.rewardAmount).toBe('75');
    });
  });

  describe('TestRunner & Proof-of-Work Generator', () => {
    it('should execute a passing command and measure duration', async () => {
      const runner = new TestRunner('node -e "console.log(\'OK\'); process.exit(0)"');
      const result = await runner.runTests();

      expect(result.passed).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('OK');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should capture failure when test exits with non-zero code', async () => {
      const runner = new TestRunner('node -e "process.exit(1)"');
      const result = await runner.runTests();

      expect(result.passed).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should package a structured Proof-of-Work bundle', async () => {
      const runner = new TestRunner('node -e "process.exit(0)"');
      const { bundle, markdown } = await runner.generateProofOfWork('task-123', 42, 'https://github.com/test/pr/1');

      expect(bundle.taskId).toBe('task-123');
      expect(bundle.issueNumber).toBe(42);
      expect(bundle.prUrl).toBe('https://github.com/test/pr/1');
      expect(bundle.testPassed).toBe(true);
      expect(markdown).toContain('Gibwork Bounty Submission');
      expect(markdown).toContain('task-123');
    });
  });

  describe('GibworkService', () => {
    it('should initialize and list active bounties from Gibwork API', async () => {
      const service = new GibworkService(undefined, false);
      const bounties = await service.listAvailableTasks(1, 5);

      expect(Array.isArray(bounties)).toBe(true);
      if (bounties.length > 0) {
        expect(bounties[0].taskId).toBeDefined();
        expect(bounties[0].title).toBeDefined();
        expect(bounties[0].tokenSymbol).toBeDefined();
      }
    });
  });
});
