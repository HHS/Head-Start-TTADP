# 23. Remove Free-text Resource Auto-detection

Date: 2025-11-17

## Status

Accepted

## Context

Resources were historically harvested automatically from various free text fields (Activity Report context/notes, TTA provided, next step notes, goal/objective names, etc.). Those auto detected entries inflated resource dashboards/filters and CSV exports with URLs that users never explicitly marked as resources. Customers asked that URLs embedded in free text no longer be treated as resources.

## Decision

- Disable every `*_AUTODETECTED_FIELDS` list across Activity Reports, Next Steps, Goals, Goal Templates, Activity Report Goals, and Activity Report Objectives so no new records are scraped from free text.
- Add migration `20251113221500-remove_autodetected_resources` to delete historical join-table rows whose `sourceFields` lack legitimate source tags (keeping legacy ECLKC/nonECLKC entries and manual `resource` entries).
- Preserve the `Resources` table rows themselves so legitimate references (and legacy lists) remain intact.

## Consequences

- Resource dashboards/filters/CSV exports now only include URLs that users explicitly recorded (or the legacy ECLKC/nonECLKC lists).
- No hooks or background jobs collect URLs from free text anymore, reducing unexpected data growth and noise.
- The cleanup migration must be run in each environment to purge the historical auto detected rows. It runs inside a transaction and includes audit logging. A snapshot/backup of the database will be retained in case the removed rows need to be recovered.
- If future requirements reintroduce auto detection, those lists will need to be revisited deliberately.
