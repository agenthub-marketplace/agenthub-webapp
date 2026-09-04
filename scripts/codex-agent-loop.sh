#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

TASK_FILE="${1:-}"
MAX_ITERS="${MAX_ITERS:-3}"
VALIDATE_CMD="${VALIDATE_CMD:-npm run agent:validate}"
LOG_DIR=".codex-loop"
RUN_ID="$(date -u +"%Y%m%dT%H%M%SZ")"

print_status() {
  echo
  echo "Final git status:"
  git status --short
}

trap print_status EXIT

fail() {
  echo "Error: $*" >&2
  exit 1
}

is_positive_int() {
  case "$1" in
    ''|*[!0-9]*) return 1 ;;
    *) [ "$1" -gt 0 ] ;;
  esac
}

contains_forbidden_command() {
  local cmd=" $1 "
  case "$cmd" in
    *" git commit "*|*" git push "*|*" npm publish "*|*" deploy "*|*" vercel "*|*" supabase db push "*|*" supabase migration "*|*" prisma migrate "*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

workspace_fingerprint() {
  {
    git status --porcelain=v1
    git diff --no-ext-diff --binary
    git diff --cached --no-ext-diff --binary
    git ls-files --others --exclude-standard -z | while IFS= read -r -d '' file; do
      printf 'UNTRACKED %s\n' "$file"
      if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file"
      else
        cksum "$file"
      fi
    done
  } | if command -v sha256sum >/dev/null 2>&1; then sha256sum; else cksum; fi
}

[ -n "$TASK_FILE" ] || fail "usage: $0 <task-file>"
[ -f "$TASK_FILE" ] || fail "task file not found: $TASK_FILE"
[ -f "AGENTS.md" ] || fail "AGENTS.md not found"
is_positive_int "$MAX_ITERS" || fail "MAX_ITERS must be a positive integer"
command -v codex >/dev/null 2>&1 || fail "codex CLI not found in PATH"

if contains_forbidden_command "$VALIDATE_CMD"; then
  fail "VALIDATE_CMD contains a forbidden commit/push/deploy/database command"
fi

mkdir -p "$LOG_DIR"

AGENTS_CONTENT="$(cat AGENTS.md)"
TASK_CONTENT="$(cat "$TASK_FILE")"

echo "AgentHub Codex loop"
echo "Task: $TASK_FILE"
echo "Max iterations: $MAX_ITERS"
echo "Validation: $VALIDATE_CMD"
echo "Logs: $LOG_DIR/$RUN_ID-*"

last_status=1
last_fingerprint="$(workspace_fingerprint)"

for iter in $(seq 1 "$MAX_ITERS"); do
  codex_log="$LOG_DIR/$RUN_ID-iter-$iter-codex.log"
  validate_log="$LOG_DIR/$RUN_ID-iter-$iter-validate.log"

  echo
  echo "Iteration $iter/$MAX_ITERS: running codex exec"

  codex exec --cd "$ROOT_DIR" --sandbox workspace-write - >"$codex_log" 2>&1 <<EOF
You are working in AgentHub.

Follow AGENTS.md exactly. Never commit, push, deploy, publish, install dependencies, modify the database, modify RLS, or expose service-role secrets.

AGENTS.md:

${AGENTS_CONTENT}

Task file (${TASK_FILE}):

${TASK_CONTENT}

Iteration: ${iter}/${MAX_ITERS}

Keep the change scoped to the task. After editing, summarize what changed and what validation should run.
EOF

  codex_status=$?
  if [ "$codex_status" -ne 0 ]; then
    echo "codex exec failed with status $codex_status. See $codex_log"
    last_status=$codex_status
    continue
  fi

  current_fingerprint="$(workspace_fingerprint)"
  if [ "$current_fingerprint" = "$last_fingerprint" ]; then
    echo "No workspace progress detected after iteration $iter. Stopping early."
    last_status=1
    break
  fi
  last_fingerprint="$current_fingerprint"

  echo "Iteration $iter/$MAX_ITERS: running validation"
  if sh -c "$VALIDATE_CMD" >"$validate_log" 2>&1; then
    echo "Validation passed. See $validate_log"
    last_status=0
    break
  fi

  last_status=$?
  echo "Validation failed with status $last_status. See $validate_log"
done

if [ "$last_status" -ne 0 ]; then
  echo
  echo "Loop stopped without passing validation."
  exit "$last_status"
fi

echo
echo "Loop completed successfully."
