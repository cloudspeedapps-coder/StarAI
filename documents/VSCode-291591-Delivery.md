# VS Code bug fix delivery

Published on October 28, 2026.

- Draft pull request: https://github.com/microsoft/vscode/pull/344811
- Issue fixed: https://github.com/microsoft/vscode/issues/291591
- Fork: https://github.com/cloudspeedapps-coder/vscode
- Branch: `codex/fix-291591-whole-word-search`
- Local repository: `../vscode`
- Local commit: `813d6cefb19eacf6192b2260df866bccf18c3f20`
- Published head: `f6d9f0428998faaa8f7a43869c1bb6e5ef1fab3d`

The local repository was cloned from Microsoft VS Code main at `26a195e52141c371f1b1fcb88ba4a6df9fadcf3d`. The published branch starts from the newer fork main. The upstream changes between these bases do not modify any of the three files in this fix. Command-line pushing stalled, so the three tested source files were committed through GitHub's browser editor under the signed-in cloudspeedapps-coder account. This produces three remote commits instead of the single local commit. All three published file blob hashes exactly match the local tested commit; the PR contains 89 additions and 11 deletions across three files, with no unrelated changes.

Validation: 182 browser unit tests passed across TextModelSearch, PieceTreeTextBuffer, and FindModel. Targeted ESLint and whitespace checks passed. Six new regression cases failed before the fix. Logs and a standalone patch are in `../qa/vscode-2026-10-28-batch2/`. Full Electron/native validation, full TypeScript typechecking, and manual testing of the patched desktop application were not performed. GitHub CI completion is not asserted.

The PR explicitly acknowledges the existing proposal #326447. It is published as a draft for review and is not merged.


## Copilot review corrections

The user chose to scope overlap retries to literal-text Find and retain existing complex-regex behavior. Added explicit search-mode metadata and a non-global/non-sticky termination guard. Both review regressions failed before the correction; all 186 related browser tests and targeted lint pass afterward. The performance regression allows at most two scans instead of 8,001. Four published source-file blob hashes match the tested local commit `9a7cf876` exactly. PR head: `b00aac50ef01f2d0b8ec84e7dc163d214549713c`. The PR title and description now explain the narrowed scope. Copilot's existing review threads were left open for verification; no new approval or completed CI run is claimed.
