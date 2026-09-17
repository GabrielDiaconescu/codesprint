"""Executes every runnable snippet in the content and checks it does what the content claims.

SPEC §35.2. Validation proves the files are well formed; this proves they are *true*. A lesson
that says a program prints 24 when it prints 25 passes every schema check ever written, and
teaches the wrong thing to every learner who reads it.

Each snippet runs on EVERY supported interpreter (D9: 3.12 and the latest stable 3.x), because
output that differs between versions is a trap — the learner's Python may not be ours.

Deliberately standard library only. The manifest is produced by `runnables.ts`, so this script
needs no YAML parser, no virtualenv and no install step on any machine or in CI.

Usage:
    python verify_python.py <manifest.json>
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

# The interpreters every snippet must agree on (D9).
#
# 3.12 is the floor: it is what most learners and most distributions have. The second entry is
# the current stable release — bump it when a new one ships, so the content is checked against
# what a learner installing Python today actually gets.
REQUIRED_VERSIONS = ["3.12", "3.14"]

# A snippet in this course is a few lines of arithmetic. Anything that takes longer has either
# been written wrong or is waiting for input that will never come.
TIMEOUT_SECONDS = 10


@dataclass
class Interpreter:
    version: str
    command: list[str]


def find_interpreter(version: str) -> Interpreter | None:
    """Locates one interpreter, portably.

    Windows installs sit behind the `py` launcher and are not on PATH under a versioned name;
    POSIX systems expose `python3.12` directly. An explicit override wins over both, which is
    what CI uses.
    """
    override = os.environ.get(f"PYTHON_{version.replace('.', '_')}")
    candidates: list[list[str]] = []

    if override:
        candidates.append([override])
    if shutil.which(f"python{version}"):
        candidates.append([f"python{version}"])
    if shutil.which("py"):
        candidates.append(["py", f"-{version}"])

    for command in candidates:
        try:
            result = subprocess.run(
                [*command, "--version"],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
            )
        except (OSError, subprocess.SubprocessError):
            continue

        reported = (result.stdout + result.stderr).strip()
        if result.returncode == 0 and reported.startswith(f"Python {version}"):
            return Interpreter(version=version, command=command)

    return None


@dataclass
class Execution:
    ok: bool
    stdout: str
    detail: str


def run_snippet(interpreter: Interpreter, code: str) -> Execution:
    """Runs one snippet in a throwaway directory, with no arguments and no stdin.

    The temporary directory matters: a snippet that writes a file must not litter the
    repository, and one that reads a file must not accidentally find a real one. Closing stdin
    turns a snippet that waits for input into a fast, clear failure instead of a hung suite.
    """
    with tempfile.TemporaryDirectory(prefix="codesprint-verify-") as workdir:
        script = Path(workdir) / "snippet.py"
        script.write_text(code, encoding="utf-8")

        try:
            result = subprocess.run(
                [*interpreter.command, str(script)],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
                cwd=workdir,
                stdin=subprocess.DEVNULL,
                # PYTHONIOENCODING keeps output identical on a Windows console whose default
                # code page would otherwise mangle anything outside ASCII.
                env={**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONDONTWRITEBYTECODE": "1"},
            )
        except subprocess.TimeoutExpired:
            return Execution(False, "", f"did not finish within {TIMEOUT_SECONDS}s")

    stdout = result.stdout.replace("\r\n", "\n").rstrip()

    if result.returncode != 0:
        last_line = (result.stderr.strip().splitlines() or ["(no message)"])[-1]
        return Execution(False, stdout, last_line)

    return Execution(True, stdout, "")


def check(case: dict, interpreter: Interpreter) -> str | None:
    """Returns a failure message, or None when the case holds."""
    outcome = run_snippet(interpreter, case["code"])

    if case["kind"] == "expect_output":
        expected = case["expected"].replace("\r\n", "\n").rstrip()
        if not outcome.ok:
            return f"failed to run: {outcome.detail}"
        if outcome.stdout != expected:
            return f"printed {outcome.stdout!r} but the content says {expected!r}"
        return None

    if case["kind"] == "expect_broken":
        not_expected = case["notExpected"].replace("\r\n", "\n").rstrip()
        # Failing to run is a perfectly good way for broken code to be broken.
        if not outcome.ok:
            return None
        if outcome.stdout == not_expected:
            return (
                "runs correctly and prints the expected answer, so there is no bug to find"
            )
        return None

    return f"unknown case kind {case['kind']!r}"


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: verify_python.py <manifest.json>", file=sys.stderr)
        return 2

    manifest = Path(sys.argv[1])
    if not manifest.exists():
        print(f"manifest not found: {manifest}", file=sys.stderr)
        return 2

    cases = json.loads(manifest.read_text(encoding="utf-8"))

    interpreters: list[Interpreter] = []
    missing: list[str] = []
    for version in REQUIRED_VERSIONS:
        found = find_interpreter(version)
        if found:
            interpreters.append(found)
        else:
            missing.append(version)

    if missing:
        print(
            "Missing required Python version(s): " + ", ".join(missing) + "\n"
            "Install them, or point PYTHON_" + missing[0].replace(".", "_") + " at an "
            "interpreter. Content must be verified on every version a learner might use (D9).",
            file=sys.stderr,
        )
        return 2

    print(f"Verifying {len(cases)} snippet(s) on {len(interpreters)} interpreter(s):")
    for interpreter in interpreters:
        print(f"  Python {interpreter.version}  ({' '.join(interpreter.command)})")

    failures: list[str] = []
    for interpreter in interpreters:
        for case in cases:
            problem = check(case, interpreter)
            if problem:
                failures.append(f"[{interpreter.version}] {case['where']}\n    {problem}")

    if failures:
        print(f"\n{len(failures)} snippet(s) do not do what the content claims:\n", file=sys.stderr)
        for failure in failures:
            print(failure, file=sys.stderr)
        return 1

    print(f"\nAll {len(cases)} snippet(s) verified on every interpreter.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
