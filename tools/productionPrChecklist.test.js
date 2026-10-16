const { deriveChecklistFacts, applyChecklistDefaults } = require('./productionPrChecklist');

describe('deriveChecklistFacts', () => {
  it('flags docs/CI/infra-only changes as not affecting functional code', () => {
    const facts = deriveChecklistFacts(['docs/guides/testing.md', '.github/workflows/foo.yml']);

    expect(facts).toEqual({
      hasMigrations: false,
      hasAdr: false,
      hasApiDocsChange: false,
      hasBoundaryDiagramChange: false,
      affectsUi: false,
      affectsFunctionalCode: false,
    });
  });

  it('detects migrations, ADRs, API docs, and boundary diagram changes', () => {
    const facts = deriveChecklistFacts([
      'src/migrations/20260101000000-add-column.js',
      'docs/adr/0030-new-decision.md',
      'docs/openapi/paths/foo.yaml',
      'docs/boundary_diagram.md',
    ]);

    expect(facts.hasMigrations).toBe(true);
    expect(facts.hasAdr).toBe(true);
    expect(facts.hasApiDocsChange).toBe(true);
    expect(facts.hasBoundaryDiagramChange).toBe(true);
  });

  it('flags frontend changes as affecting UI', () => {
    const facts = deriveChecklistFacts(['frontend/src/components/Foo.js']);
    expect(facts.affectsUi).toBe(true);
  });

  it('flags any non-docs/CI/infra file as affecting functional code, even backend-only', () => {
    const facts = deriveChecklistFacts(['src/services/foo.js']);
    expect(facts.affectsUi).toBe(false);
    expect(facts.affectsFunctionalCode).toBe(true);
  });

  it('treats an empty change set as not affecting anything', () => {
    const facts = deriveChecklistFacts([]);
    expect(facts.affectsFunctionalCode).toBe(false);
  });
});

describe('applyChecklistDefaults', () => {
  const template = [
    '### Every PR',
    '',
    '- [ ] Linked Jira issue',
    '- [ ] JIRA issue status updated',
    '- [ ] Code is meaningfully tested',
    '- [ ] Meets accessibility standards (WCAG 2.1 Levels A, AA)',
    '- [ ] API Documentation updated',
    '- [ ] Boundary diagram updated',
    '- [ ] Logical Data Model updated',
    '- [ ] [Architectural Decision Records](https://adr.github.io/) written for major infrastructure decisions',
    '- [ ] UI review complete',
    '- [ ] QA review complete',
    '',
    '### Before merge to main',
    '',
    '- [ ] OHS demo complete',
    '- [ ] Ready to create production PR',
    '',
    '### Production Deploy',
    '',
    '- [ ] PR created as **Draft**',
    '- [ ] Staging smoke test completed',
    '- [ ] PR transitioned to **Open** _(triggers automation)_',
    '',
    '### After merge/deploy',
    '',
    '- [ ] Update JIRA ticket status',
  ].join('\n');

  it('checks the always-true items and n/a-defaults the rest for a docs/CI/infra-only release', () => {
    const facts = {
      hasMigrations: false,
      hasAdr: false,
      hasApiDocsChange: false,
      hasBoundaryDiagramChange: false,
      affectsUi: false,
      affectsFunctionalCode: false,
    };

    const result = applyChecklistDefaults(template, facts);

    expect(result).toContain('- [x] Linked Jira issue');
    expect(result).toContain('- [x] JIRA issue status updated');
    expect(result).toContain('- [x] Code is meaningfully tested');
    expect(result).toContain('- [n/a] Meets accessibility standards (WCAG 2.1 Levels A, AA)');
    expect(result).toContain('- [n/a] API Documentation updated');
    expect(result).toContain('- [n/a] Boundary diagram updated');
    expect(result).toContain('- [n/a] Logical Data Model updated');
    expect(result).toContain(
      '- [n/a] [Architectural Decision Records](https://adr.github.io/) written for major infrastructure decisions'
    );
    expect(result).toContain('- [n/a] UI review complete');
    expect(result).toContain('- [n/a] QA review complete');
    expect(result).toContain('- [x] OHS demo complete');
    expect(result).toContain('- [x] Ready to create production PR');
    expect(result).toContain('- [ ] PR created as **Draft**');
  });

  it('checks UI/QA/feature-dependent items when the release touches app code', () => {
    const facts = {
      hasMigrations: true,
      hasAdr: true,
      hasApiDocsChange: true,
      hasBoundaryDiagramChange: true,
      affectsUi: true,
      affectsFunctionalCode: true,
    };

    const result = applyChecklistDefaults(template, facts);

    expect(result).toContain('- [x] Meets accessibility standards (WCAG 2.1 Levels A, AA)');
    expect(result).toContain('- [x] API Documentation updated');
    expect(result).toContain('- [x] Boundary diagram updated');
    expect(result).toContain('- [x] Logical Data Model updated');
    expect(result).toContain('- [x] UI review complete');
    expect(result).toContain('- [x] QA review complete');
  });

  it('leaves unmatched Production Deploy and After merge/deploy items unchecked', () => {
    const facts = {
      hasMigrations: false,
      hasAdr: false,
      hasApiDocsChange: false,
      hasBoundaryDiagramChange: false,
      affectsUi: false,
      affectsFunctionalCode: false,
    };

    const result = applyChecklistDefaults(template, facts);

    expect(result).toContain('- [ ] Staging smoke test completed');
    expect(result).toContain('- [ ] PR transitioned to **Open** _(triggers automation)_');
    expect(result).toContain('- [ ] Update JIRA ticket status');
  });

  it('leaves non-checklist lines untouched', () => {
    const result = applyChecklistDefaults(template, deriveChecklistFactsAllFalse());
    expect(result).toContain('### Every PR');
    expect(result).toContain('### Production Deploy');
  });

  it('overwrites an already-checked box when recomputed facts say it should be n/a', () => {
    const allTrue = {
      hasMigrations: true,
      hasAdr: true,
      hasApiDocsChange: true,
      hasBoundaryDiagramChange: true,
      affectsUi: true,
      affectsFunctionalCode: true,
    };

    const firstPass = applyChecklistDefaults(template, allTrue);
    expect(firstPass).toContain('- [x] UI review complete');

    const secondPass = applyChecklistDefaults(firstPass, deriveChecklistFactsAllFalse());
    expect(secondPass).toContain('- [n/a] UI review complete');
    expect(secondPass).not.toContain('- [x] UI review complete');
  });

  it('overwrites an already-n/a box when recomputed facts say it should be checked', () => {
    const firstPass = applyChecklistDefaults(template, deriveChecklistFactsAllFalse());
    expect(firstPass).toContain('- [n/a] Logical Data Model updated');

    const secondPass = applyChecklistDefaults(firstPass, {
      ...deriveChecklistFactsAllFalse(),
      hasMigrations: true,
    });

    expect(secondPass).toContain('- [x] Logical Data Model updated');
  });

  it('overwrites an item regardless of simulating a human having manually unchecked it', () => {
    const checked = applyChecklistDefaults(template, {
      hasMigrations: false,
      hasAdr: false,
      hasApiDocsChange: false,
      hasBoundaryDiagramChange: false,
      affectsUi: false,
      affectsFunctionalCode: false,
    });

    // Simulate a human manually unchecking an always-true item.
    const humanEdited = checked.replace(
      '- [x] Code is meaningfully tested',
      '- [ ] Code is meaningfully tested'
    );

    const result = applyChecklistDefaults(humanEdited, deriveChecklistFactsAllFalse());
    expect(result).toContain('- [x] Code is meaningfully tested');
  });

  it('still leaves unmatched Production Deploy items untouched even when they are already checked', () => {
    const humanChecked = template.replace(
      '- [ ] Staging smoke test completed',
      '- [x] Staging smoke test completed'
    );

    const result = applyChecklistDefaults(humanChecked, deriveChecklistFactsAllFalse());
    expect(result).toContain('- [x] Staging smoke test completed');
  });

  it('never touches any line inside "### Production Deploy", even one that coincidentally matches a rule', () => {
    // Simulates a future template edit reusing a covered phrase inside
    // Production Deploy - the section-boundary exclusion must still hold
    // even though the line text would otherwise match a CHECKLIST_RULES entry.
    const templateWithCollision = template.replace(
      '- [ ] PR transitioned to **Open** _(triggers automation)_',
      '- [ ] Code is meaningfully tested before PR transitioned to **Open**'
    );

    const result = applyChecklistDefaults(templateWithCollision, {
      hasMigrations: true,
      hasAdr: true,
      hasApiDocsChange: true,
      hasBoundaryDiagramChange: true,
      affectsUi: true,
      affectsFunctionalCode: true,
    });

    expect(result).toContain(
      '- [ ] Code is meaningfully tested before PR transitioned to **Open**'
    );
  });

  it('never checks "PR created as Draft", even when every other item is checked', () => {
    const result = applyChecklistDefaults(template, {
      hasMigrations: true,
      hasAdr: true,
      hasApiDocsChange: true,
      hasBoundaryDiagramChange: true,
      affectsUi: true,
      affectsFunctionalCode: true,
    });

    expect(result).toContain('- [ ] PR created as **Draft**');
  });

  it('resumes applying defaults correctly to "After merge/deploy" once Production Deploy has ended', () => {
    const result = applyChecklistDefaults(template, deriveChecklistFactsAllFalse());
    // "Update JIRA ticket status" has no rule, so it's untouched either way,
    // but this confirms the section-boundary flag was correctly cleared
    // rather than leaking past the end of Production Deploy.
    expect(result).toContain('- [ ] Update JIRA ticket status');
  });

  it('applies defaults on a CRLF body (the line ending a real GitHub PR body actually uses) while leaving Production Deploy unchanged', () => {
    const crlfTemplate = template.split('\n').join('\r\n');

    const result = applyChecklistDefaults(crlfTemplate, {
      hasMigrations: true,
      hasAdr: false,
      hasApiDocsChange: false,
      hasBoundaryDiagramChange: false,
      affectsUi: false,
      affectsFunctionalCode: false,
    });

    // Every line, including a CRLF one, should have had its default applied -
    // not just the last line of the body (which has no trailing \r).
    expect(result).toContain('- [x] Linked Jira issue\r\n');
    expect(result).toContain('- [x] Logical Data Model updated\r\n');
    expect(result).toContain('- [n/a] QA review complete\r\n');
    // Production Deploy must still never be touched on a CRLF body.
    expect(result).toContain('- [ ] PR created as **Draft**\r\n');
    expect(result).toContain('- [ ] Staging smoke test completed\r\n');
    // The whole body stays CRLF throughout, not partially converted to LF.
    expect(result).not.toMatch(/[^\r]\n/);
  });
});

function deriveChecklistFactsAllFalse() {
  return {
    hasMigrations: false,
    hasAdr: false,
    hasApiDocsChange: false,
    hasBoundaryDiagramChange: false,
    affectsUi: false,
    affectsFunctionalCode: false,
  };
}
