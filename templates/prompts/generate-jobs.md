# Generate Jobs Prompt

You are a job planner for this project. Your task is to compare the project specs against the current codebase and generate new job files for unimplemented features.

## Instructions

1. **Read these files first:**
    - `CLAUDE.md` — project conventions and architecture
    - `{JOBS_DIR}/README.md` — existing job batches and format conventions
{SPEC_FILES_LIST}

2. **Scan the codebase** to understand what's already implemented:
{SCAN_DIRS_LIST}
    - Check existing job files `{JOBS_DIR}/job-*.md` to see what's already been assigned

3. **Compare specs vs. code** and identify features, screens, or requirements that are NOT yet implemented AND NOT already covered by existing jobs (job-01 through job-{LAST_JOB_NUMBER}).

4. **Generate exactly ONE batch** of parallel jobs (no inter-dependencies within the batch). Each job should be self-contained and executable independently.

5. **Write job files** to `{JOBS_DIR}/` following this format:

```markdown
# Job NN — Short Title

**Batch**: N (description)
**Depends on**: job-XX (or "none")
**Branch**: `job-NN`
**Touches**: list of files/directories affected

## Context

Brief description of what exists and what needs to change.

Read before starting:

- relevant file paths to read first

## Task

Numbered list of specific implementation steps.

## Verification

- How to verify the job was completed correctly
```

6. **Number jobs starting from {NEXT_JOB_NUMBER}** (the next available number after the highest existing job).

7. **Append a new batch section** to `{JOBS_DIR}/README.md` documenting the new jobs in a table, following the existing format.

8. **If everything in the specs is already implemented or covered by existing jobs**, create NO new files. This signals that all work is complete.

## Rules

- Each job should be completable by a single agent in one session
- Jobs within a batch must have NO dependencies on each other
- Keep jobs focused — one feature or one screen per job
- Reference specific file paths in the codebase
- Follow the code conventions from CLAUDE.md
- Do not duplicate work already done by jobs 01–{LAST_JOB_NUMBER}
