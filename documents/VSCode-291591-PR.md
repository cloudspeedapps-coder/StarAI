# Fix whole-word literal search skipping overlapping valid matches

Fixes microsoft/vscode#291591.

Searching for `aa-aa` with Match Whole Word enabled and regex mode off misses the trailing `aa-aa` in `xaa-aa-aa`. The first candidate begins inside a word and is rejected, but search resumes after that entire candidate, skipping a valid overlapping start. Resume at the next possible word boundary after rejected literal candidates in both literal fast paths and the regex engine used internally for case-insensitive literal search and capture results. Accepted matches retain their existing non-overlapping behavior.

`SearchData.isLiteralSearch` carries the user's search mode into each Searcher. Overlap retries apply only to literal-text searches. User-entered regular expressions retain their prior behavior of advancing past rejected candidates. This avoids introducing repeated suffix scans for patterns such as `a.*b` on `'a '.repeat(8000) + 'bx'`. This PR does not add overlap support for regex mode or promise bounded execution of arbitrary JavaScript regexes.

Non-global, non-sticky regexes terminate after their first match because they ignore `lastIndex`. This includes both rejected and accepted empty matches; global and sticky empty matches continue to advance normally.

Related work: #326447 is an existing open proposal for this issue. I reviewed that proposal during validation, including its performance and non-global-regex considerations. This draft focuses on literal-text search and does not supersede that contributor's work.

## Validation

- Reproduced both Copilot findings with bounded tests before the correction: rejected non-global empty matches repeated, and the 8,000-word regex case executed 8,001 scans.
- The corrected performance regression asserts at most two scans. Termination tests cover several zero-width patterns plus accepted non-global, global, and sticky matches.
- Retains coverage for the original issue across case modes, capture results, chunked piece-tree buffers, forward/backward search, LF/CRLF, and Unicode surrogate pairs. Regex-mode expectations preserve previous behavior.
- 186 tests pass across TextModelSearch, PieceTreeTextBuffer, and FindModel. Targeted ESLint passes for all four changed files; `git diff --check` passes.
- Compiled with `npm run build-fast -- --client-only`.

```text
node test/unit/browser/index.js --browser chromium-chrome --run src/vs/editor/test/common/model/textModelSearch.test.ts --run src/vs/editor/test/common/model/pieceTreeTextBuffer/pieceTreeTextBuffer.test.ts --run src/vs/editor/contrib/find/test/browser/findModel.test.ts --reporter dot
npm run eslint -- src/vs/editor/common/model.ts src/vs/editor/common/model/textModelSearch.ts src/vs/editor/common/model/pieceTreeTextBuffer/pieceTreeBase.ts src/vs/editor/test/common/model/textModelSearch.test.ts
```

Environment: Windows ARM64, Node 24.19.0, Chrome browser test runner. The local test base requests Node 24.22.1. Full Electron/native validation and a full TypeScript typecheck were not run. The original issue was reproduced manually in installed VS Code 1.144.0; the patched desktop application has not been manually retested. Browser tests ran on the local checkout; published file contents are verified against that tested checkout while preserving the PR's upstream merges.
