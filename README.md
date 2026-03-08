# Sprint Agents — Usage Guide

## Prerequisites

- **Node.js** >= 20
- **Git** repository initialized
- **Claude CLI** (`claude` command in PATH)
- **gh CLI** (for GitHub PR creation)
- **Python 3** (for GitLab MR creation)
- **Bash 4+**

### Environment variables

| Variable        | Required for | Description                  |
| --------------- | ------------ | ---------------------------- |
| `GITLAB_TOKEN`  | GitLab only  | GitLab API authentication    |

## Quick start

```bash
npm install -g sprint-agents   # or npx sprint-agents

cd your-project
sprint-agents init              # scaffold config, jobs/, prompts/
sprint-agents sprint            # run one sprint iteration
```

## Commands

### `init`

Interactive setup that creates the project scaffolding.

```bash
sprint-agents init
```

You will be prompted for:

- **Base branch** — branch sprints are created from (default: `main`)
- **Platform** — `github` or `gitlab` (default: `github`)
- **Repository** — `owner/repo` format (required)

Creates:

```
sprint-agents.config.json
jobs/
  README.md
  CHANGELOG.md
  run-jobs.sh
prompts/
  generate-jobs.md
  ticket.md
```

If a `package.json` exists, convenience npm scripts are added automatically.

### `sprint`

Runs a single sprint iteration end-to-end.

```bash
sprint-agents sprint
```

Flow:

1. Creates branch `sprint-N` from `baseBranch` (auto-incremented)
2. Generates job files by invoking Claude with `prompts/generate-jobs.md`
3. Executes jobs in parallel via worktrees, then merges sequentially
4. Updates `jobs/CHANGELOG.md` with results
5. Runs E2E tests (if `e2eCommand` is configured)
6. Pushes branch and creates a pull request
7. Sends an OS notification (if `notifyOnComplete` is enabled)

### `loop`

Continuously generates and runs sprints until specs are fully covered.

```bash
sprint-agents loop
```

- Uses a persistent `agents` branch (created once, reused across iterations)
- Creates or updates a single PR after each iteration
- Terminates when Claude generates no new jobs

### `multi-sprint <N>`

Runs N sprint iterations, accumulating all changes into a single PR.

```bash
sprint-agents multi-sprint 5
```

- E2E tests run once after all iterations complete
- Exits early if an iteration produces no new jobs

### `ticket <file>`

Generates and runs jobs from a ticket description.

```bash
sprint-agents ticket path/to/feature-request.md
```

- Uses `prompts/ticket.md` (injects ticket content as `{TICKET_CONTENT}`)
- Creates branch `ticket-{name}` (auto-incremented if duplicate)
- Same execution pipeline as `sprint` (parallel jobs → merge → E2E → PR)

## Configuration

File: `sprint-agents.config.json`

```jsonc
{
  "baseBranch": "main",           // Branch sprints are created from
  "jobsDir": "jobs",              // Directory for generated job files
  "specsDir": "specs",            // Directory for specification files
  "promptsDir": "prompts",        // Directory for prompt templates
  "platform": "github",           // "github" or "gitlab"
  "remote": "origin",             // Git remote name
  "repo": "owner/repo",          // Repository identifier (required)
  "specFiles": [],                // Spec file paths passed to Claude
  "scanDirs": ["src/"],           // Directories for Claude to scan
  "e2eCommand": null,             // E2E test command (e.g. "npm run test:e2e")
  "claudeModel": null,            // Claude model override
  "notifyOnComplete": true        // OS notification on completion
}
```

Only `repo` is required. Everything else has sensible defaults.

## Common workflows

### 1. Implement features from specs

Write spec files describing the desired behavior, reference them in config, then let sprint-agents iterate until done.

```bash
# 1. Add specs
mkdir specs
echo "# Auth spec ..." > specs/auth.md

# 2. Point config at them
# Edit sprint-agents.config.json:
#   "specFiles": ["specs/auth.md"],
#   "scanDirs": ["src/"]

# 3. Run until complete
sprint-agents loop
```

### 2. Execute a single ticket

When you have a ticket or feature request as markdown, hand it off directly.

```bash
sprint-agents ticket tickets/add-search.md
```

### 3. Batch multiple sprints

Run a fixed number of iterations when you want predictable scope.

```bash
sprint-agents multi-sprint 3
```

### 4. Customize prompts

Edit `prompts/generate-jobs.md` to change how Claude breaks work into jobs. Available placeholders:

| Placeholder          | Value                                  |
| -------------------- | -------------------------------------- |
| `{LAST_JOB_NUMBER}`  | Highest existing job number            |
| `{NEXT_JOB_NUMBER}`  | Next job number to assign              |
| `{JOBS_DIR}`         | Jobs directory path                    |
| `{SPEC_FILES_LIST}`  | Formatted list of spec files           |
| `{SCAN_DIRS_LIST}`   | Formatted list of directories to scan  |
| `{TICKET_CONTENT}`   | Ticket markdown (ticket mode only)     |

## How jobs work

### Generation

Claude reads your specs and codebase, then writes `job-NN-title.md` files into the jobs directory. Each job includes context, step-by-step tasks, and verification criteria.

### Execution

Jobs run in parallel using git worktrees — each job gets an isolated branch. After all jobs finish, results are merged sequentially back onto the sprint branch. Conflicts are auto-resolved by Claude.

### Tracking

- `jobs/README.md` — batch table tracking all generated jobs
- `jobs/CHANGELOG.md` — auto-updated after each run with job names and commit links

## Job file format

```markdown
# Job NN — Short Title

**Batch**: N (description)
**Depends on**: job-XX (or "none")
**Branch**: `job-NN`
**Touches**: list of files/directories

## Context
What exists and what needs to change.

## Task
1. Step-by-step instructions
2. ...

## Verification
- How to verify the job is complete
```

## Notifications

Sprint-agents sends OS-native notifications on completion:

- **Linux** — `notify-send`
- **macOS** — `osascript`
- **Windows/WSL** — PowerShell toast

Disable with `"notifyOnComplete": false` in config.
