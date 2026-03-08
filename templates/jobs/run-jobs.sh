#!/usr/bin/env bash
# Generalized job runner — accepts job file paths as CLI arguments.
# Runs all jobs in parallel via `claude --worktree`, then merges sequentially.
#
# Usage:
#   bash jobs/run-jobs.sh jobs/job-26-foo.md jobs/job-27-bar.md
#
# Jobs run in parallel worktrees. After all complete, each worktree branch
# is squash-merged sequentially into the current branch (no merge commits).
# Conflicts are resolved automatically using Claude.
set -euo pipefail

# --- Parse arguments ---
if [[ $# -eq 0 ]]; then
	echo "ERROR: No job files provided"
	echo "Usage: run-jobs.sh JOB_FILES..."
	exit 1
fi

JOB_FILES=("$@")

JOBS_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$JOBS_DIR")"
cd "$ROOT_DIR"

BASE_BRANCH="$(git branch --show-current)"

# --- Results directory for changelog ---
RESULTS_DIR=$(mktemp -d)
trap 'rm -rf "$RESULTS_DIR"' EXIT

# --- Helper functions ---

run_job() {
	local job_file="$1"
	local job_name
	job_name="$(basename "$job_file" .md)"

	# Extract branch name (e.g. "job-26" from "job-26-foo.md")
	local branch
	branch="$(echo "$job_name" | grep -oP '^job-\d+')"

	# claude --worktree creates branches with "worktree-" prefix
	local worktree_branch="worktree-$branch"

	# Result file for changelog
	local result_file="$RESULTS_DIR/$job_name"
	echo "job_name=$job_name" > "$result_file"
	echo "worktree_branch=$worktree_branch" >> "$result_file"

	echo "[$(date +%H:%M:%S)] Starting $job_name on branch $worktree_branch (base: $BASE_BRANCH)"
	claude --worktree "$branch" --print \
		"Read the job spec at $job_file and execute it. Branch: $worktree_branch. Base branch: $BASE_BRANCH. Follow all instructions in the job spec and CLAUDE.md. Create a single commit when done." \
		2>&1 | sed "s/^/[$job_name] /"
	echo "[$(date +%H:%M:%S)] Finished $job_name"

	# Capture commit SHA from worktree branch
	local commit_sha
	commit_sha=$(git rev-parse "$worktree_branch" 2>/dev/null || echo "")
	if [[ -n "$commit_sha" ]]; then
		echo "commit=$commit_sha" >> "$result_file"
	fi
}

merge_branch() {
	local branch="$1"
	local job_name="$2"

	echo "[$job_name] Squash-merging $branch into $BASE_BRANCH..."

	# Find commits on the worktree branch that aren't on the current branch
	local merge_base
	merge_base=$(git merge-base "$BASE_BRANCH" "$branch")

	# Cherry-pick all commits from the branch squashed into one
	if git cherry-pick --no-commit "$merge_base".."$branch" 2>&1 | sed "s/^/[$job_name] /"; then
		# Extract the original commit message from the branch tip
		local original_msg
		original_msg=$(git log -1 --format=%s "$branch")
		git commit -m "$original_msg" 2>&1 | sed "s/^/[$job_name] /"
		echo "[$job_name] Squash-merge successful"
	else
		echo "[$job_name] Conflict detected — resolving with Claude..."
		claude --print \
			"There are cherry-pick conflicts after squash-merging branch '$branch' into '$BASE_BRANCH'. Resolve all conflicts in the working tree. Keep changes from both sides where possible, preferring the incoming branch ('$branch') for new features. After resolving, stage all files with git add and run: git cherry-pick --continue" \
			2>&1 | sed "s/^/[$job_name] /"
		# If cherry-pick --continue left uncommitted state, commit it
		if ! git diff --cached --quiet 2>/dev/null; then
			local original_msg
			original_msg=$(git log -1 --format=%s "$branch")
			git commit -m "$original_msg" 2>&1 | sed "s/^/[$job_name] /" || true
		fi
		echo "[$job_name] Conflict resolution complete"
	fi

	# Clean up the worktree branch
	git branch -d "$branch" 2>/dev/null || git branch -D "$branch" 2>/dev/null || true
}

wait_all() {
	local pids=("$@")
	local failed=0
	for pid in "${pids[@]}"; do
		if ! wait "$pid"; then
			echo "ERROR: Job with PID $pid failed"
			failed=1
		fi
	done
	return $failed
}

# --- Phase 1: Run all jobs in parallel ---

echo "========================================="
echo "  Running ${#JOB_FILES[@]} job(s) [branch: $BASE_BRANCH]"
echo "========================================="
echo ""

pids=()
for job_file in "${JOB_FILES[@]}"; do
	if [[ ! -f "$job_file" ]]; then
		echo "ERROR: Job file not found: $job_file"
		exit 1
	fi
	run_job "$job_file" &
	pids+=($!)
done

wait_all "${pids[@]}"

# --- Phase 2: Merge worktree branches sequentially ---

echo ""
echo "========================================="
echo "  Merging ${#JOB_FILES[@]} job(s) into $BASE_BRANCH"
echo "========================================="
echo ""

for result_file in "$RESULTS_DIR"/*; do
	[[ -f "$result_file" ]] || continue
	local_job_name=$(grep '^job_name=' "$result_file" | cut -d= -f2-)
	local_branch=$(grep '^worktree_branch=' "$result_file" | cut -d= -f2-)
	if [[ -n "$local_branch" ]] && git show-ref --verify --quiet "refs/heads/$local_branch"; then
		merge_branch "$local_branch" "$local_job_name"
	else
		echo "WARNING: Branch $local_branch not found for $local_job_name — skipping merge"
	fi
done

# --- Phase 3: Clean up worktrees ---

echo ""
echo "Cleaning up worktrees..."

for job_file in "${JOB_FILES[@]}"; do
	job_name="$(basename "$job_file" .md)"
	branch="$(echo "$job_name" | grep -oP '^job-\d+')"
	worktree_dir="$ROOT_DIR/.claude/worktrees/$branch"

	if [[ -d "$worktree_dir" ]]; then
		git worktree remove "$worktree_dir" --force 2>/dev/null || rm -rf "$worktree_dir"
		echo "  Removed worktree: $worktree_dir"
	fi

	worktree_branch="worktree-$branch"
	if git show-ref --verify --quiet "refs/heads/$worktree_branch" 2>/dev/null; then
		git branch -D "$worktree_branch" 2>/dev/null || true
		echo "  Deleted branch: $worktree_branch"
	fi
done

# Prune any stale worktree references
git worktree prune 2>/dev/null || true

echo ""
echo "========================================="
echo "  All ${#JOB_FILES[@]} job(s) complete!"
echo "========================================="

# --- Output results for changelog consumption ---
# Each line: job_name|commit_sha
echo ""
echo ">>> RESULTS_START"
for result_file in "$RESULTS_DIR"/*; do
	[[ -f "$result_file" ]] || continue
	local_job_name=$(grep '^job_name=' "$result_file" | cut -d= -f2-)
	local_commit=$(grep '^commit=' "$result_file" | cut -d= -f2- || echo "")
	echo "$local_job_name|$local_commit|"
done
echo ">>> RESULTS_END"
