import { GitBountyConfig, BountyRecord } from '../types/config.js';
export declare const CONFIG_FILE_NAME = ".gitbounty.json";
/**
 * Finds the root directory of the current git repository.
 */
export declare function findGitRoot(startDir?: string): string;
/**
 * Gets path to the .gitbounty.json config file.
 */
export declare function getConfigPath(dir?: string): string;
/**
 * Loads and validates .gitbounty.json config, or returns a default configuration.
 */
export declare function loadConfig(dir?: string): GitBountyConfig;
/**
 * Saves configuration to .gitbounty.json.
 */
export declare function saveConfig(config: GitBountyConfig, dir?: string): void;
/**
 * Record a new or updated bounty in .gitbounty.json
 */
export declare function recordBounty(record: BountyRecord, dir?: string): void;
/**
 * Finds a bounty record by issue number or taskId
 */
export declare function getBountyRecord(identifier: string | number, dir?: string): BountyRecord | undefined;
/**
 * Resolves Solana private key from CLI flags, env vars, or local keypair files.
 */
export declare function resolvePrivateKey(cliKeypairPath?: string): string | null;
//# sourceMappingURL=config.d.ts.map