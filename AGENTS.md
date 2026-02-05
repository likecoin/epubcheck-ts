# AI Agent Guide - epubcheck-ts

All project rules, coding standards, and conventions are in `CONTRIBUTING.md` — read it first. This file adds agent-specific context only.

## Quick Context

TypeScript port of Java EPUBCheck. Java reference source at `../epubcheck` (sibling directory).

**Key files:**
- `README.md` - Project overview, architecture, API, commands
- `CONTRIBUTING.md` - All rules: coding standards, testing, porting, common tasks, implementation notes
- `PROJECT_STATUS.md` - All volatile status: completion %, test counts, known issues, priorities, skipped tests

---

## Agent-Specific Notes

### Validation Logic
- Always cross-reference `../epubcheck` Java source when implementing or fixing logic
- The message registry is at `src/messages/messages.ts` (re-exported via `src/messages/index.ts`)
- Import pattern: `import { MessageId, pushMessage } from '../messages/index.js';`

### Environment
- The `epubcheck` CLI (Java) is available in the system PATH — always use it instead of compiling or running Java source directly

### Code Style
- Do not add unnecessary code comments — only comment where the logic isn't self-evident

### E2E Tests Are Sacred
- Imported Java e2e tests are the **source of truth** — never modify their expectations
- `it.skip` = unimplemented backlog, not a workaround for failing tests
- Only exception: inherent dependency limitation (document in skip annotation + `PROJECT_STATUS.md`)

### When You're Done

Update `PROJECT_STATUS.md` (the **only** place for volatile status):

- **New feature** → Move items between implementation status lists; update completion %
- **New tests ported** → Update e2e coverage table and test count totals
- **Bug fix** → Update "Known Issues" / "Skipped Tests" if applicable
- **New message ID** → Update "Message IDs" counts
- **New dependency limitation** → Add to "Known Issues"
