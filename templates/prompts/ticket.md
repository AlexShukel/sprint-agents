# Ticket Implementation Prompt

You are a job planner for this project. A ticket describing desired system modifications has been provided. Your task is to break it down into executable jobs that implement the requested changes.

## Ticket Description

{TICKET_CONTENT}

## Instructions

1. **Read these files first:**
    - `CLAUDE.md` — project conventions and architecture
    - `{JOBS_DIR}/README.md` — existing job batches and format conventions
{SPEC_FILES_LIST}

2. **Scan the codebase** to understand what's already implemented:
{SCAN_DIRS_LIST}
    - Check existing job files `{JOBS_DIR}/job-*.md` to see what's already been assigned

3. **Analyze the ticket** and determine exactly what changes are needed across the entire stack:
    - Database schema changes (migrations, policies, seed data)
    - Server API changes (routes, services, validation)
    - Web frontend changes (pages, components, routes, styling)
    - Spec updates (requirements, design documents)
    - Test additions or modifications

4. **Update specs first.** If the ticket introduces new features or changes existing ones, update the relevant spec files to reflect the new requirements BEFORE generating jobs. This keeps specs as the source of truth.

5. **Generate exactly ONE batch** of parallel jobs (no inter-dependencies within the batch). Each job should be self-contained and executable independently. If the ticket requires sequential work, generate multiple batches with explicit dependencies.

6. **Write job files** to `{JOBS_DIR}/` following this format:

```markdown
# Job NN — Short Title

**Batch**: N (ticket: short-ticket-name)
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

7. **Number jobs starting from {NEXT_JOB_NUMBER}** (the next available number after the highest existing job).

8. **Append a new batch section** to `{JOBS_DIR}/README.md` documenting the new jobs in a table, following the existing format.

## Rules

- Each job should be completable by a single agent in one session
- Jobs within a batch must have NO dependencies on each other
- Keep jobs focused — one feature or one concern per job
- Reference specific file paths in the codebase
- Follow the code conventions from CLAUDE.md
- Do not duplicate work already done by jobs 01–{LAST_JOB_NUMBER}
- If the ticket requires spec changes, include those changes in the relevant job (or create a dedicated spec-update job that other jobs depend on)
- If the ticket touches tests, include test updates in the relevant job or create a separate testing job
