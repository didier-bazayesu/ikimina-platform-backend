# Project Rules for AI Coding Assistants

These rules apply to every task: bug fix, new feature, refactor, or "just a quick change."
Do not skip steps because a task looks small — small tasks are exactly where duplication and
regressions sneak in.

## Scope: frontend is primary, backend is debug-only

The backend is an already-built, working system. Most work here is on the **frontend**.
Sections 0–3 below are the default (frontend) rules. When a task involves the **backend**
instead, treat it strictly as debugging, not development — see Section 5, which narrows
(not replaces) the rules below. When it's unclear which side a task touches, ask, or state
the assumption ("treating this as a frontend task since it's about the UI/state layer").

## 0. Before touching any code

1. **Read the existing project structure first.** Run `ls -R` (or view the directory tree) on
   the relevant module(s) before writing anything. Identify:
   - Where similar features/entities already live (services, controllers, DTOs, repositories,
     utils, etc.)
   - The existing naming conventions, folder layout, and file naming patterns
   - The existing patterns for error handling, validation, response shaping, and logging
2. **Search for existing logic before writing new logic.** Grep/search the codebase for
   function names, keywords, or concepts related to the task (e.g. "overdue", "hash", "generate")
   before implementing anything new. If something similar already exists:
   - Reuse it, extend it, or refactor it into a shared function — do NOT duplicate it.
   - If duplication is unavoidable (rare), explicitly say why in the response.
3. **State a short plan before coding.** 3–5 bullet points: what will change, which files,
   and any assumptions being made. Don't silently guess on ambiguous requirements — state the
   assumption and proceed, or ask one clarifying question if the ambiguity is significant.

## 1. While implementing

- **Match existing conventions**, don't introduce a new pattern (e.g. a new error-handling
  style, a new response wrapper, a new naming scheme) unless asked to, or unless the existing
  pattern is demonstrably broken — and if so, flag it rather than silently deviating.
- **Prefer composition and reuse** over copy-pasted blocks. If the same 5+ lines appear twice,
  extract a function/helper.
- **Performance**: default to the approach with better time/space complexity when it doesn't
  meaningfully hurt readability. Avoid N+1 queries, redundant loops over the same data, and
  unnecessary re-renders/re-computation. Note any deliberate perf/readability trade-off made.
- **Code quality**: small, single-responsibility functions; descriptive names; no dead code;
  no commented-out code left behind; handle edge cases and errors explicitly (don't swallow
  exceptions silently).
- **Code organization**: put new code where the existing structure implies it should go
  (e.g. don't add a service method to a controller). If the task doesn't cleanly fit the
  existing structure, say so before deciding where to put it.

## 2. Before declaring the task done

Run these, in order, and report the actual output (not just "should work"):

1. `npm run lint` (or the project's configured ESLint script) — fix all new lint errors/warnings
   introduced by the change. Do not silence rules with `eslint-disable` unless there's a clear,
   stated reason.
2. `npm test` (or the project's test script) — all existing tests must still pass. If a test
   fails because of the change, either fix the code or update the test *deliberately* (state
   why), never delete/skip a failing test to make the run green.
3. **Add/update tests** for new logic or bug fixes when the project has a test suite — at
   minimum cover the new behavior and the bug being fixed.
4. **Re-scan for duplication**: confirm the new code didn't end up re-implementing something
   that already existed elsewhere in the codebase.

## 3. Reporting back

After finishing, summarize:
- What changed and why (short)
- Lint result (pass/fail, and what was fixed)
- Test result (pass/fail, and what was added/changed)
- Any assumptions made or trade-offs taken
- Anything found during the codebase scan that looks like an existing bug or duplication,
  even if out of scope for this task

## 4. Hard rules (never skip)

- Never invent an API, library function, or config key without checking it exists in this
  project's dependencies/version.
- Never remove or weaken tests/lint rules just to make a change pass.
- Never introduce a second implementation of something that already exists — extend or
  refactor the existing one instead.
- Never mark a task complete without actually having run lint and tests in this session.

## 5. Backend tasks: debugging mode only

The backend is done and working elsewhere in the system. When a task touches it, the goal is
to find and fix the specific defect — not to redesign, restructure, or "improve" it.

- **Reproduce before changing anything.** Confirm the bug with an actual request/test/log
  output first. Don't patch code based on a guess at what's wrong.
- **Minimum viable fix.** Change only what's needed to fix the confirmed defect. Don't
  refactor surrounding code, rename things, or "clean up while I'm in here" — file that as a
  separate suggestion instead of doing it inline.
- **Don't touch working endpoints/logic** outside the bug's blast radius, even if they look
  imperfect. Flag concerns in the summary; don't fix unrequested things.
- **Still run the backend's lint/tests** (Section 2) for anything actually changed, and
  confirm no previously-passing test now fails.
- **State root cause, not just symptom**, in the summary — e.g. "the join-date guard was
  correctly skipping this case" vs. "added a null check" — so it's clear whether this was a
  real bug or a misunderstanding of existing behavior.
- If the investigation reveals the backend needs an actual design change (not just a bug
  fix), stop and say so explicitly rather than making the change unprompted.