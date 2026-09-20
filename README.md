<p align="center">
  <h1 align="center">⚡ git-bounty</h1>
  <p align="center">
    <strong>The Native Git CLI Extension, GitHub Actions CI Engine, and Terminal Dashboard for the Gibwork Solana Bounty Protocol</strong>
  </p>
  <p align="center">
    <a href="#key-features">Features</a> •
    <a href="#why-this-is-valuable">Why It Wins</a> •
    <a href="#installation">Install</a> •
    <a href="#quickstart--commands">Command Reference</a> •
    <a href="#github-actions-cicd">CI/CD Engine</a> •
    <a href="#architecture">Architecture</a>
  </p>
</p>

---

## 🎯 Executive Summary & Bounty Use Case

**`git-bounty`** is a developer-first tool built for the **Gibwork Developer Hackathon ($1,000 Bounty)**. 

Existing solutions like `gib-hunt` or `gib-sentinel` act solely as **read-only search viewers** and folder scaffolders. They do not bridge the actual **open-source maintainer workflow**, **Git commits**, **automated test verification**, or **PR merge-to-payout automation**.

`git-bounty` solves this by introducing a **native Git subcommand (`git bounty`)** and **GitHub Actions engine** that bridges Web2 codebases with Web3 Solana escrow:
1. **Maintainers** can fund and post bounties directly from GitHub issues without leaving the terminal (`git bounty post #42 --reward 50USDC`).
2. **Contributors** can claim bounties, auto-scaffold git branches, run test suites, and submit verified work directly from git commits (`git bounty claim`, `git bounty submit`).
3. **CI/CD & Merge-to-Payout**: When a contributor's PR passes CI and merges, `git-bounty` automatically triggers `@gibwork/sdk`'s `submissions.approve()` to release escrow funds on Solana.
4. **Interactive Terminal TUI**: An interactive split-pane dashboard (`git bounty dashboard`) to explore bounties, view requirements, inspect diffs, and check Solana wallet balances.

---

## 🚀 Key Features

* **⚡ Native Git Subcommand**: Integrated directly into Git (`git bounty ...` or `git-bounty ...`), matching tools like `git-lfs`.
* **🔗 GitHub Issue-to-Escrow Automation**: Automatically extracts issue context, calculates token mints, funds the Solana escrow, and updates GitHub with sticky status badges and claim commands.
* **🌿 Automated Git Workspaces**: `git bounty claim` automatically cuts dedicated branches (`bounty/issue-42`), scaffolds `.bounty/SPEC.md`, and sets up acceptance checklists.
* **🧪 Test-Driven Proof of Work (PoW)**: `git bounty test` runs local test suites, while `git bounty submit` bundles git diffs, commit hashes, and test execution output into an anti-spam Gibwork submission with 0.15 USDC fee signing.
* **🤖 GitHub Actions CI/CD Engine**: A ready-to-use reusable composite action (`action.yml`) that verifies PRs in CI and automatically settles on-chain escrow upon PR merge.
* **🖥️ Interactive Terminal TUI Dashboard**: Built with **Ink** & **React**, featuring live bounty feeds, split-pane requirement inspectors, and hotkey navigation.
* **🛡️ Production Keypair Security**: Adheres to `@gibwork/cli` standards: reads `chmod 600` keypairs, respects environment variables, and never logs secret keys.

---

## 📦 Installation

### Prerequisites
* **Node.js**: `>= 22.0.0`
* **Git**: `>= 2.30.0`
* **Solana Wallet**: (Optional for discovery; required for escrow creation and submissions)

### Global Installation
```bash
# Clone the repository
git clone https://github.com/Blackwrld04/git-bounty.git
cd git-bounty

# Install dependencies and build
npm install
npm run build

# Link to local bin so `git bounty` works everywhere
mkdir -p ~/.local/bin
ln -sf $(pwd)/dist/bin/git-bounty.js ~/.local/bin/git-bounty
```

Verify the installation:
```bash
git bounty -h
# or
git-bounty --help
```

---

## ⚙️ Configuration & Wallet Setup

### 1. Initialize Repository
Run inside any Git repository:
```bash
git bounty init
```
This detects your GitHub remote and generates `.gitbounty.json` in the root:
```json
{
  "version": "1",
  "repo": "owner/repository",
  "network": "stage",
  "defaultToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "defaultTokenSymbol": "USDC",
  "testCommand": "npm test"
}
```

### 2. Configure Solana Keypair
Set your keypair using one of three secure methods:

```bash
# Method A: Private key JSON array or base58
export SOLANA_PRIVATE_KEY="[1,2,3,...]"

# Method B: Keypair file path
export SOLANA_KEYPAIR_PATH="/path/to/keypair.json"

# Method C: Default Solana CLI keypair (~/.config/solana/id.json)
```

Run wallet diagnostics:
```bash
git bounty wallet
```

---

## 🛠️ Complete Command Reference

### For Maintainers & Sponsors

#### 1. Post & Fund a Bounty from a GitHub Issue
```bash
git bounty post 42 --reward 50 --token USDC
```
* Reads GitHub issue `#42` (title, description, labels).
* Funds the Solana escrow via `@gibwork/sdk`.
* Comments on the GitHub issue with claim instructions and escrow receipt.
* Adds a `bounty: 50 USDC` label to the issue.

#### 2. Review Submissions
```bash
git bounty review 42
# or
git bounty review <taskId>
```
* Inspects incoming submissions, participant wallets, and proof-of-work diffs.

#### 3. Merge PR & Settle Escrow
```bash
git bounty settle 15
```
* Merges GitHub PR `#15`.
* Executes on-chain escrow release via `@gibwork/sdk` `submissions.approve()`.
* Posts transaction receipt to the PR.

---

### For Contributors & Bounty Hunters

#### 1. Browse Active Bounties
```bash
git bounty browse --min-reward 20 --tag TypeScript
```
Outputs a clean table with Task IDs, rewards, tokens, and requirement tags. Supports `--json` for scripting.

#### 2. Claim a Bounty
```bash
git bounty claim 42
# or
git bounty claim <taskId>
```
* Automatically creates and switches to branch: `bounty/issue-42-slug`.
* Scaffolds `.bounty/SPEC.md` containing acceptance criteria and deliverable checklist.

#### 3. Run Verification Tests
```bash
git bounty test
```
* Executes the repository's test command (e.g. `npm test`, `cargo test`).
* Verifies zero test regressions before submission.

#### 4. Submit Proof of Work
```bash
git bounty submit --pr https://github.com/owner/repo/pull/15
```
* Checks that git working tree is clean.
* Generates proof-of-work bundle (commit hash, git diff stat, test run logs).
* Signs the 0.15 USDC participation fee and dispatches on-chain via `@gibwork/sdk`.

---

### Interactive TUI Dashboard

Launch the keyboard-driven terminal dashboard:
```bash
git bounty dashboard
# or
git bounty tui
```
* Navigate active bounties with `↑` / `↓`.
* View real-time requirements, rewards, and descriptions in the split pane.
* Press `[c]` to claim.
* Press `[q]` to quit.

---

## 🤖 GitHub Actions CI/CD Integration

`git-bounty` provides an automated CI engine that tests incoming PRs and executes on-chain payouts upon merge.

Add `.github/workflows/bounty-ci.yml` to your repository:

```yaml
name: Gibwork Bounty CI/CD Engine

on:
  pull_request:
    types: [opened, synchronize, closed]

jobs:
  # Automated Verification on PR
  verify:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npx git-bounty test --cmd "npm test"

  # Automated Merge-to-Payout Escrow Release
  settle:
    if: github.event.action == 'closed' && github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Settle On-Chain Gibwork Escrow
        env:
          SOLANA_PRIVATE_KEY: ${{ secrets.GIBWORK_SPONSOR_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GIBWORK_NETWORK: production
        run: |
          npx git-bounty settle ${{ github.event.pull_request.number }} --yes
```

---

## 🏗️ Technical Architecture

```
┌────────────────────────────────────────────────────────┐
│                   git-bounty CLI                       │
├───────────────────┬───────────────────┬────────────────┤
│   Git Service     │   GitHub Service  │ Gibwork Service│
│  (simple-git)     │  (gh CLI / REST)  │ (@gibwork/sdk) │
└─────────┬─────────┴─────────┬─────────┴────────┬───────┘
          │                   │                  │
          ▼                   ▼                  ▼
   Local Git Tree     GitHub Issues & PRs   Solana Escrow
  (Branches, Diffs)    (Comments, Labels)   (Mainnet/Devnet)
```

---

## 🧪 Testing & Verification

Run the full test suite:
```bash
npm test
```
Includes:
* Git branch and status verification.
* Config serialization and schema parsing.
* TestRunner execution and PoW payload bundling.
* Gibwork API discovery and reward formatting.

---

## 📜 License
MIT © [Blackwrld04](https://github.com/Blackwrld04)
