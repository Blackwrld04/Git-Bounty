import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import dotenv from 'dotenv';
import { GitBountyConfig, GitBountyConfigSchema, BountyRecord } from '../types/config.js';

// Load .env automatically if present in current directory
dotenv.config();

export const CONFIG_FILE_NAME = '.gitbounty.json';

/**
 * Finds the root directory of the current git repository.
 */
export function findGitRoot(startDir: string = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      // Reached filesystem root without finding .git, fallback to startDir
      return path.resolve(startDir);
    }
    current = parent;
  }
}

/**
 * Gets path to the .gitbounty.json config file.
 */
export function getConfigPath(dir: string = process.cwd()): string {
  return path.join(findGitRoot(dir), CONFIG_FILE_NAME);
}

/**
 * Loads and validates .gitbounty.json config, or returns a default configuration.
 */
export function loadConfig(dir: string = process.cwd()): GitBountyConfig {
  const configPath = getConfigPath(dir);
  if (!fs.existsSync(configPath)) {
    return GitBountyConfigSchema.parse({
      version: '1',
      network: (process.env.GIBWORK_NETWORK as 'stage' | 'production') || 'production',
      bounties: {},
    });
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return GitBountyConfigSchema.parse(parsed);
  } catch (error) {
    // If parsing fails, return default with warning
    return GitBountyConfigSchema.parse({
      version: '1',
      network: 'production',
      bounties: {},
    });
  }
}

/**
 * Saves configuration to .gitbounty.json.
 */
export function saveConfig(config: GitBountyConfig, dir: string = process.cwd()): void {
  const configPath = getConfigPath(dir);
  const validated = GitBountyConfigSchema.parse(config);
  fs.writeFileSync(configPath, JSON.stringify(validated, null, 2), 'utf8');
}

/**
 * Record a new or updated bounty in .gitbounty.json
 */
export function recordBounty(record: BountyRecord, dir: string = process.cwd()): void {
  const config = loadConfig(dir);
  const key = record.issueNumber ? String(record.issueNumber) : record.taskId;
  config.bounties[key] = record;
  saveConfig(config, dir);
}

/**
 * Finds a bounty record by issue number or taskId
 */
export function getBountyRecord(identifier: string | number, dir: string = process.cwd()): BountyRecord | undefined {
  const config = loadConfig(dir);
  const idStr = String(identifier);

  if (config.bounties[idStr]) {
    return config.bounties[idStr];
  }

  // Look for match by taskId
  for (const record of Object.values(config.bounties)) {
    if (record.taskId === idStr || String(record.issueNumber) === idStr) {
      return record;
    }
  }

  return undefined;
}

/**
 * Resolves Solana private key from CLI flags, env vars, or local keypair files.
 */
export function resolvePrivateKey(cliKeypairPath?: string): string | null {
  // 1. Direct env variable (JSON byte array or base58 string)
  if (process.env.SOLANA_PRIVATE_KEY) {
    return process.env.SOLANA_PRIVATE_KEY.trim();
  }
  if (process.env.GIBWORK_PRIVATE_KEY) {
    return process.env.GIBWORK_PRIVATE_KEY.trim();
  }

  // 2. Candidate keypair file paths
  const candidatePaths: string[] = [];

  if (cliKeypairPath) {
    candidatePaths.push(path.resolve(cliKeypairPath));
  }

  if (process.env.SOLANA_KEYPAIR_PATH) {
    candidatePaths.push(path.resolve(process.env.SOLANA_KEYPAIR_PATH));
  }

  if (process.env.GIBWORK_KEYPAIR_PATH) {
    candidatePaths.push(path.resolve(process.env.GIBWORK_KEYPAIR_PATH));
  }

  // Check config file setting
  const config = loadConfig();
  if (config.keypairPath) {
    candidatePaths.push(path.resolve(config.keypairPath));
  }

  // Default Solana CLI keypair location
  const defaultSolanaPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  candidatePaths.push(defaultSolanaPath);

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const content = fs.readFileSync(candidate, 'utf8').trim();
        return content;
      } catch (err) {
        // Continue to next candidate
      }
    }
  }

  return null;
}
