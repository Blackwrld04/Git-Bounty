import { z } from 'zod';

export const BountyRecordSchema = z.object({
  taskId: z.string(),
  issueNumber: z.number().optional(),
  title: z.string(),
  rewardAmount: z.string(),
  tokenMint: z.string(),
  status: z.enum(['open', 'in_progress', 'submitted', 'completed', 'refunded']),
  createdAt: z.string(),
  claimedBy: z.string().optional(),
  branchName: z.string().optional(),
  submissionId: z.string().optional(),
  escrowAddress: z.string().optional(),
  prNumber: z.number().optional(),
});

export type BountyRecord = z.infer<typeof BountyRecordSchema>;

export const GitBountyConfigSchema = z.object({
  version: z.literal('1'),
  repo: z.string().optional(), // e.g. "owner/repo"
  network: z.enum(['stage', 'production']).default('stage'),
  apiUrl: z.string().optional(),
  defaultToken: z.string().default('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // Default USDC
  defaultTokenSymbol: z.string().default('USDC'),
  testCommand: z.string().default('npm test'),
  keypairPath: z.string().optional(),
  bounties: z.record(z.string(), BountyRecordSchema).default({}),
});

export type GitBountyConfig = z.infer<typeof GitBountyConfigSchema>;

export const KNOWN_TOKENS: Record<string, { symbol: string; mint: string; decimals: number }> = {
  USDC: {
    symbol: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  SOL: {
    symbol: 'SOL',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
  },
};
