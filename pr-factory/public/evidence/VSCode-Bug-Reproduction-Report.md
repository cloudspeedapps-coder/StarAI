# VS Code bug reproduction report — batch 2

Test date: October 28, 2026. Tester: Codex operating the installed VS Code desktop UI. These are three additional public reports, distinct from the earlier Markdown batch.

## Results

| Public issue | Local result | Evidence |
|---|---|---|
| [#196884 — newline lookbehind single Replace fails](https://github.com/microsoft/vscode/issues/196884) | Reproduced. Two successive single Replace actions advanced the match without changing text; Replace All changed all three correctly. | [Single Replace](evidence/196884-single-replace.png), [repeat](evidence/196884-single-replace-repeat.png), [control](evidence/196884-replace-all-control.png) |
| [#291591 — whole-word Find misses a match](https://github.com/microsoft/vscode/issues/291591) | Reproduced. Literal Find found three occurrences; whole-word Find found only two, omitting line 2. Toggling off/on repeated the failure. | [Off](evidence/291591-whole-word-off.png), [on](evidence/291591-whole-word-on.png), [repeat](evidence/291591-whole-word-repeat.png) |
| [#309282 — Copy Line Down loses third cursor](https://github.com/microsoft/vscode/issues/309282) | Reproduced with adapted cursor setup. Three carets became two on the copied line, twice. A marker confirmed the missing caret after `baz`. | [Before](evidence/309282-three-cursors-before.png), [after](evidence/309282-copy-down-two-cursors.png), [marker](evidence/309282-cursor-probe.png), [repeat](evidence/309282-copy-down-repeat.png) |

All three issues were open when retrieved. These results confirm the reported symptoms in this local configuration; they do not establish root cause or frequency across installations.

## Environment and scope

- Installed VS Code stable 1.144.0, commit `2c33b50b16c472efe58357d1d2a8a5414bc23fbf`. Version checked in the installed app package and visible release notes; commit established during the preceding version verification.
- Windows x64; OS version recorded in the preceding run: Windows NT 10.0.28000.0.
- Existing user profile, Restricted Mode, local Plain Text editor, UTF-8, LF fixtures. No clean-profile or extension-bisect comparison was performed.
- The tests used native UI actions and screenshots. Original fixtures were prepared as ordinary files; the tested transformations were performed in VS Code.
- Screenshots are unedited captures. Immediate accessibility snapshots sometimes lagged the visible UI; conclusions use the screenshots and, for Replace All, the saved file contents.
- No new extension installation, product update, remote SSH session, or GitHub posting was performed during this batch.

## 1. Single Replace fails with newline lookbehind

Source: [microsoft/vscode#196884](https://github.com/microsoft/vscode/issues/196884). Reported on Windows VS Code 1.83.1; the report also describes failure on 1.84 Insiders web builds.

Fixture: [lookbehind.txt](lookbehind.txt).

```text
a-b-c
a-b-d
a-b-e
a-c-d
a-c-e
a-d-e
b-c-d
b-c-e
b-d-e
c-d-e
```

Steps executed:

1. Open the fixture, press Ctrl+H, and enter `(?<=\n)b` in Find.
2. Enable regular expressions. Set replacement to `BBB`. Whole-word mode is off.
3. Confirm three matches and the first selected match at line 7.
4. Click single Replace. Inspect text and match count.
5. Click single Replace again on the next match.
6. Click Replace All as a comparison, save the test file, and read its contents.

Expected: the first click changes line 7 to `BBB-c-d`, reducing remaining matches to two. The next click changes line 8.

Actual: the first click moved from match 1 of 3 to 2 of 3 with `b-c-d` unchanged. The second moved to 3 of 3 with `b-c-e` unchanged. Replace All then produced `BBB-c-d`, `BBB-c-e`, and `BBB-d-e`. The saved [control output](lookbehind-after-replace-all.txt) confirms all three replacements.

Assessment: reproduced on two successive matches in one document session. This was not two independent application restarts. User impact: individual replacements can silently be skipped. Suggested triage priority: P2, a tester recommendation rather than Microsoft’s assigned priority. Replace All is a demonstrated workaround only when changing every match is intended.

## 2. Whole-word Find misses the trailing occurrence on line 2

Source: [microsoft/vscode#291591](https://github.com/microsoft/vscode/issues/291591). Reported with Windows VS Code 1.108.2 and a remote Linux SSH environment. This test used a local file.

Fixture: [whole-word.txt](whole-word.txt).

```text
[1] aa-aa
[2] xaa-aa-aa
[3] aax-aa-aa
```

Steps executed:

1. Open the fixture and search for `aa-aa`.
2. Explicitly disable regex mode and leave whole-word mode off; observe three matches.
3. Enable Match Whole Word; inspect highlighted lines and total count.
4. Toggle whole-word mode off and on again.

Expected according to the report: three whole-word matches, including the trailing `aa-aa` on line 2, which starts after a hyphen and ends at the end of the line.

Actual: whole-word mode showed `1 of 2`, highlighting lines 1 and 3 only. Turning it off returned `1 of 3`; turning it on again returned `1 of 2`. The text was unchanged. The behavior was also seen while regex mode was enabled during initial setup; the final evidence and conclusion use regex disabled.

Assessment: reproduced, with two observed whole-word-on states separated by a successful off-mode control. The original remote environment was not recreated. No assertion is made about VS Code’s internal matching algorithm. User impact: a search or replacement workflow may omit valid occurrences. Suggested priority: P2. Disabling whole-word mode exposes all three occurrences but requires manual boundary checking.

## 3. Copy Line Down drops the third cursor

Source: [microsoft/vscode#309282](https://github.com/microsoft/vscode/issues/309282). Reported on Windows 11, VS Code 1.116.0 Insiders.

Fixture: [multicursor.txt](multicursor.txt), initially `foo bar baz` followed by LF.

Steps executed:

1. Open the fixture. In Find, enable regex, disable whole-word mode, and search `foo|bar|baz`.
2. Press Alt+Enter to select all three matches. Press Escape to dismiss Find, then Right to collapse each selection to its end.
3. Verify three zero-length selections: `foo| bar| baz|`.
4. Press Shift+Alt+Down to copy the line down.
5. Inspect the selection count, then type `x` to expose the surviving caret positions.
6. Undo the marker, undo the copy, verify three restored carets, and repeat Shift+Alt+Down.

Expected: all three carets move to the copied line. Typing `x` there should yield `foox barx bazx`.

Actual: the status bar changed from `3 selections` to `2 selections`. The copied line retained carets after `foo` and `bar`; typing `x` produced `foox barx baz`. After resetting, the copy again reduced three carets to two.

Assessment: the reported failure reproduced twice. Setup adaptation: the report uses Alt+Click from left to right; this run constructed the same visible positions through regex selection and Right. Mouse-based cursor creation itself was not tested. Copy Line Up was not tested. User impact: subsequent simultaneous edits silently omit the last position. Suggested priority: P2. Re-establishing cursors after copying is a possible workaround, not tested here.

## Evidence and cleanup

The `evidence` folder contains 11 PNG captures. [public-issues.json](public-issues.json) preserves the fetched source reports. [observations.json](observations.json) contains structured local conclusions and evidence paths; [manifest.json](manifest.json) lists file hashes.

The three original fixture contents were restored and verified from disk. The successful Replace All output is retained separately. Test tabs were closed, and regex and whole-word search modes were returned to off. Search history may retain the test terms. The pre-existing user document was not edited.

Product requirements derived from this work: [BugReproduce.prd](../../documents/BugReproduce.prd). Earlier batch: [Markdown reproduction report](../vscode-2026-10-28/VSCode-Bug-Reproduction-Report.md).
