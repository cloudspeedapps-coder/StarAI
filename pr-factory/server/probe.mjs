// Fixed, bounded source-level probes. This is not a replacement for upstream tests.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { Searcher, SearchParams } = await import(
  pathToFileURL(process.argv[2]).href
);
const separators = "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?";
const wordMap = new SearchParams(
  "aa-aa",
  false,
  false,
  separators,
).parseSearchRequest().wordSeparators;
const results = [];
function check(name, fn) {
  try {
    const detail = fn();
    results.push({
      name,
      status: "pass",
      detail: detail || "Assertion passed",
    });
  } catch (e) {
    results.push({ name, status: "fail", detail: e.message });
  }
}
check("Literal overlap", () => {
  for (const matchCase of [false, true]) {
    const params = new SearchParams(
      "aa-aa",
      false,
      matchCase,
      separators,
    ).parseSearchRequest();
    const searcher = new Searcher(
      params.wordSeparators,
      params.regex,
      params.isLiteralSearch,
    );
    assert.equal(searcher.next("xaa-aa-aa")?.index, 4);
  }
  return "Trailing aa-aa found at offset 4, case-sensitive and insensitive.";
});
check("Rejected empty match terminates", () => {
  for (const source of ["$", "^", "(?:)", "(?=x)", "(?<=x)"]) {
    let executions = 0;
    class Limited extends RegExp {
      exec(text) {
        assert.ok(++executions <= 2, "Empty-match execution budget exceeded");
        return super.exec(text);
      }
    }
    assert.equal(new Searcher(wordMap, new Limited(source)).next("x"), null);
  }
  return "Five non-global empty patterns terminated within two executions each.";
});
check("Complex regex scan budget", () => {
  let executions = 0;
  class Counting extends RegExp {
    exec(text) {
      assert.ok(
        ++executions <= 3,
        "More than two scans; bounded probe stopped on third",
      );
      return super.exec(text);
    }
  }
  assert.equal(
    new Searcher(wordMap, new Counting("a.*b", "gu")).next(
      "a ".repeat(8000) + "bx",
    ),
    null,
  );
  assert.ok(executions <= 2);
  return `${executions} regex execution(s), maximum allowed 2.`;
});
check("Global empty progress", () => {
  for (const regex of [/(?:)/g, /(?:)/y]) {
    const s = new Searcher(wordMap, regex),
      indices = [];
    let m;
    while ((m = s.next("  "))) {
      indices.push(m.index);
      assert.ok(indices.length <= 3);
    }
    assert.deepEqual(indices, [0, 1, 2]);
  }
  return "Global and sticky patterns visit offsets 0, 1, 2 then stop.";
});
check("Regex behavior preserved", () => {
  const p = new SearchParams(
    "aa-aa",
    true,
    false,
    separators,
  ).parseSearchRequest();
  assert.equal(
    new Searcher(p.wordSeparators, p.regex, p.isLiteralSearch).next(
      "xaa-aa-aa",
    ),
    null,
  );
  return "User-entered regex retains non-overlapping behavior.";
});
console.log(
  JSON.stringify(
    {
      scope: "Five bounded source probes; not the 186-test browser suite",
      results,
    },
    null,
    2,
  ),
);
process.exitCode = results.some((r) => r.status === "fail") ? 1 : 0;
