const fs = require('node:fs');
const path = require('node:path');

const {
  buildReleaseScopePayloadFromRepo,
  getChangedFiles,
  createProductionPr,
  updateProductionPr,
} = require('./productionPr');
const { deriveChecklistFacts, applyChecklistDefaults } = require('./productionPrChecklist');
const { callCredalAgent } = require('./productionPrCredal');
const { renderCreateBody, renderUpdateBody } = require('./productionPrBody');

const TEMPLATE_PATH = path.join(__dirname, '../.github/pull_request_template.md');

async function run() {
  const payload = buildReleaseScopePayloadFromRepo();

  if (payload.releaseCommits.length === 0) {
    console.log('No commits in origin/production..origin/main; nothing to do.');
    return;
  }

  const content = await callCredalAgent({
    payload,
    userEmail: process.env.CREDAL_USER_EMAIL,
  });

  const dryRun = process.env.DRY_RUN === 'true';
  // Recomputed from the current full diff on every run (create and update)
  // and reapplied regardless of prior state, so the deterministic checklist
  // items never go stale as more commits land on `main` while the production
  // PR is open - see docs/productionPrAutomationPlan.md.
  const facts = deriveChecklistFacts(getChangedFiles());

  if (payload.mode === 'create') {
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const body = applyChecklistDefaults(renderCreateBody({ template, content }), facts);

    if (dryRun) {
      console.log(`[dry run] Would create PR.\nTitle: ${content.title}\n\n${body}`);
      return;
    }

    createProductionPr({ title: content.title, body });
    console.log(`Created production PR: ${content.title}`);
    return;
  }

  const body = applyChecklistDefaults(
    renderUpdateBody({ currentBody: payload.existingProductionPr.body, content }),
    facts
  );

  if (dryRun) {
    console.log(
      `[dry run] Would update PR #${payload.existingProductionPr.number}.\nTitle: ${content.title}\n\n${body}`
    );
    return;
  }

  updateProductionPr({ number: payload.existingProductionPr.number, title: content.title, body });
  console.log(`Updated production PR #${payload.existingProductionPr.number}: ${content.title}`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
