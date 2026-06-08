# Semgrep SAST

This directory is the repo-owned source of truth for the CircleCI SAST control introduced for ticket `TTAHUB-5242`.

## Files

- `scan-config.json`: pinned Semgrep CLI version, ruleset selection, scan scope, and gate threshold
- `baseline.json`: the retained baseline scan snapshot for the current control
- `dispositions.json`: dispositions for every baseline finding that remains open or intentionally unresolved

## Local workflow

1. Install the pinned Semgrep CLI version:

   ```bash
   SEMGREP_VERSION=$(node -pe "require('./security/sast/scan-config.json').semgrepVersion")
   python3 -m pip install --user "semgrep==${SEMGREP_VERSION}"
   export PATH="$HOME/.local/bin:$PATH"
   ```

2. Run the scan if you want to inspect findings without updating the baseline:

   ```bash
   yarn sast:scan
   ```

3. Refresh the baseline when explicitly approved:

   ```bash
   yarn sast:baseline
   yarn sast:dispositions
   ```

   `yarn sast:baseline` runs a fresh scan before writing `baseline.json` and records scan provenance from the exact repository state used to start the scan.
   `yarn sast:dispositions` preserves existing reviewed records by signature and only scaffolds entries for newly introduced baseline findings.

4. Check the current findings against the committed baseline and dispositions:

   ```bash
   yarn sast:check
   ```

## Operating rules

- CircleCI is the authoritative SAST control for this implementation.
- The Semgrep GitHub app, if present, is informational only and not part of the control evidence path.
- The gate currently blocks only net-new Semgrep findings with severity `ERROR`.
- Every baseline finding must have a committed disposition entry.
- Findings marked `fixed` in `dispositions.json` must not still be present in the live scan.
- Baseline generation and CI validation fail if Semgrep reports scan errors or skipped paths, so the retained baseline cannot silently come from a partial scan.
- Committed baseline provenance records the git HEAD SHA, scan config hash, and git worktree fingerprints, including whether the worktree was dirty and hashes for tracked and untracked local changes.
- The ephemeral `reports/semgrep/provenance.json` artifact may include richer untracked-entry detail for debugging, but raw local filenames are not retained in committed baseline evidence.
