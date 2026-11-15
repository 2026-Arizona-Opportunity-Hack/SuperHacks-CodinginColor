/* Runs student Python in a Web Worker with Pyodide (CPython compiled to WebAssembly).
 * Nothing runs on our server. The page kills and recreates this worker if code runs too long. */
const PYODIDE_VERSION = "0.26.4";
importScripts(`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`);

let pyodideReady = loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` }).then((py) => {
  py.runPython(`
import sys, io, json, traceback, builtins
def _cic_input(prompt=""):
    print(prompt, end="")
    return ""
builtins.input = _cic_input

def _cic_run(src, tests_json):
    out = io.StringIO()
    old = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = out
    ns = {"__name__": "__main__"}
    err = None
    try:
        exec(compile(src, "main.py", "exec"), ns)
    except BaseException as e:
        err = "".join(traceback.format_exception_only(type(e), e)).strip()
        line = getattr(e, "lineno", None) if isinstance(e, SyntaxError) else None
        tb = e.__traceback__
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == "main.py":
                line = tb.tb_lineno
            tb = tb.tb_next
        if line:
            err = f"Line {line}: {err}"
    results = []
    for t in json.loads(tests_json):
        if err:
            results.append({"name": t["name"], "passed": False, "message": "Fix the error in your code first."})
            continue
        try:
            exec(compile(t["code"], "test.py", "exec"), ns)
            results.append({"name": t["name"], "passed": True, "message": ""})
        except AssertionError as e:
            results.append({"name": t["name"], "passed": False, "message": str(e) or "Not quite yet."})
        except BaseException as e:
            results.append({"name": t["name"], "passed": False, "message": f"{type(e).__name__}: {e}"})
    sys.stdout, sys.stderr = old
    return json.dumps({"stdout": out.getvalue()[:20000], "error": err, "tests": results})
`);
  return py;
});

self.onmessage = async (e) => {
  const { id, code, tests } = e.data;
  try {
    const py = await pyodideReady;
    self.postMessage({ id, ready: true });
    const run = py.globals.get("_cic_run");
    const json = run(code, JSON.stringify(tests || []));
    run.destroy();
    self.postMessage({ id, result: JSON.parse(json) });
  } catch (err) {
    self.postMessage({ id, result: { stdout: "", error: String(err && err.message ? err.message : err), tests: [] } });
  }
};
