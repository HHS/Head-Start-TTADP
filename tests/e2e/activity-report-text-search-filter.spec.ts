import { test, expect, Page } from '@playwright/test';

async function blur(page) {
  await page.getByText('Office of Head Start TTA Hub').click();
}

/**
 * This should be called before clicking the apply filters button, it returns three
 * "waitForRequest" promises that should be awaited before continuing.
 *
 * @param page
 * @returns Array of three promises that can be awaited
 */
const waitForLandingFilterRequests = (page: Page): Promise<any>[] => {
  const overview = /\/api\/widgets\/overview/;
  const arReqRegex = /\/api\/activity-reports\?/;
  const alerts = /\/api\/activity-reports\/alerts/;

  return [
    page.waitForResponse(arReqRegex),
    page.waitForResponse(overview),
    page.waitForResponse(alerts),
  ];
}

async function getFullName(page) {
  await page.goto('/');
  const welcomeText = await page.getByRole('heading', { name: /welcome to the tta hub,/i });
  const text = await welcomeText.textContent();
  return text.replace(/welcome to the tta hub, /i, '');
}

test.describe('Activity Report Text Search Filter', () => {
  test('can search for text on indexed fields', async ({ page }) => {
    // Navigate to app.
    await page.goto('http://localhost:3000/');

    // Get username.
    const fullName = await getFullName(page);

    // Navigate to AR landing.
    await page.getByRole('link', { name: 'Activity Reports' }).click();

    // Create new report.
    await page.getByRole('link', { name: '+ New Activity Report' }).click();
    const heading = page.getByRole('heading', { name: /activity report for region \d/i });
    const regionNumber = await heading.textContent().then((text) => text!.match(/\d/)![0]);

    // Summary page.

    // Recipient.
    await page.getByText('Recipient *- Select -').click();
    await page.getByText('Agency 1.a in region 1, Inc.', { exact: true }).click();
    await page.getByText(/Agency 1.a in region 1, Inc. - 01HP044444/i).click();
    await page.getByText(/Agency 1.a in region 1, Inc. - 01HP044445/i).click();

    await blur(page);
    // Collaborator.
    await page.locator('#activityReportCollaborators div').filter({ hasText: '- Select -' }).nth(1).click();
    // select first available option.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page)

    // Why was the activity requested?
    await page.getByText('Why was this activity requested? *Get help choosing an option- Select -').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // Target population.
    await page.locator('#targetPopulations div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // Start and End Dates.
    await page.getByLabel('Start date *mm/dd/yyyy').fill('01/17/2023');
    await page.getByLabel('End date *mm/dd/yyyy').fill('01/17/2023');
    // Duration.
    await page.getByLabel('Duration in hours (round to the nearest half hour) *').click();
    await page.getByLabel('Duration in hours (round to the nearest half hour) *').fill('9.5');
    await page.getByRole('textbox', { name: 'Context' }).locator('div').nth(2).fill('The sky is blue. The ocean is deep.');
    // Type of tta.
    await page.getByRole('group', { name: /What type of TTA was provided/i }).getByText('Training').click();

    // Language.
    await page.locator('#language div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // How was the activity conducted.
    await page.getByText('In Person').click();

    // Participants.
    await page.getByText('Recipient participants *- Select -').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // Number of participants.
    await page.getByLabel('Number of participants  *').fill('5');

    // Save and Continue.
    await page.getByRole('button', { name: 'Save and continue' }).click();

    await page.waitForURL('**\/goals-objectives', {waitUntil: "networkidle"});

    // Goals page.
    await page.getByTestId('label').click();


    await page.keyboard.press('Enter');
    await blur(page);

    // Select a standard goal.
    await page.getByTestId('goal-selector').click();
    await page.waitForTimeout(2000);
    await page.keyboard.press('Enter');
    await blur(page);

    // Objective.
    await page.waitForTimeout(5000);

    // Objective title.
    await page.locator('[id="goalForEditing\.objectives\[0\]\.title"]').fill('Prepare your first meal.');

    await blur(page);

    // Topics.
    await page.getByText('Topics *').click()
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);
    // Links.
    await page.getByTestId('textInput').click();
    await page.getByTestId('textInput').fill('https://test1.gov');
    // TTA provided.
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).fill('Basic prep instruction.');

    await blur(page);

    const supportType = page.getByRole('combobox', { name: /Support type/i });
    await supportType.selectOption('Implementing');
    await blur(page);
    await page.getByRole('button', { name: 'Save goal' }).click();

    await blur(page);

    await page.getByRole('button', { name: 'Save and continue' }).click();

    // Attachments page.
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // Next steps page.
    // Specialist step 1.
    await page.getByTestId('specialistNextSteps-input').click();
    await page.getByTestId('specialistNextSteps-input').fill('Do your best and forget the rest.');
    await page.getByLabel('When do you anticipate completing step 1? *').fill('01/17/2023');
    await page.getByTestId('specialistNextSteps-button').click();
    // Specialist step 2.
    await page.getByLabel('Step 2 *').click();
    await page.getByLabel('Step 2 *').fill('I really like math');
    await page.getByLabel('When do you anticipate completing step 2? *').fill('01/17/2023');
    // Recipient step 1.
    await page.getByTestId('recipientNextSteps-input').click();
    await page.getByTestId('recipientNextSteps-input').fill('Just one small positive thought in the morning can change your whole day.');
    await page.getByLabel('When does the recipient anticipate completing step 1? *').fill('01/17/2023');
    // Recipient step 2.
    await page.getByTestId('recipientNextSteps-button').click();
    await page.getByRole('group', { name: 'Recipient\'s next steps' }).getByLabel('Step 2 *').click();
    await page.getByRole('group', { name: 'Recipient\'s next steps' }).getByLabel('Step 2 *').fill('Virtually nothing is impossible in this world.');
    await page.getByLabel('When does the recipient anticipate completing step 2? *').fill('01/17/2023');

    await page.getByRole('button', { name: 'Save and continue' }).click();

    // Submit page.
    // add creator notes
    await page.getByRole('textbox', { name: 'Additional notes' }).locator('div').nth(2).click();
    await page.keyboard.type('Sample creator notes');
    const approverDropdown = page.getByLabel('Approving manager');
    await approverDropdown.click();

    // type our name into the dropdown to filter to just us
    await page.keyboard.type(fullName);
    // press Enter to select ourself
    await page.keyboard.press('Enter');
    await blur(page);

    // extract the AR number from the URL:
    const url = page.url();
    const arNumber = url.split('/').find((part) => /^\d+$/.test(part));

    // submit for approval
    await page.getByRole('button', { name: 'Submit for approval' }).click();

    // Wait for Activity Reports page to load
    const filtersButton = await page.getByRole('button', { name: 'open filters for this page' })

    // Report text filter search.
    filtersButton.click();

    // Add report text filter.
    await page.locator('select[name="topic"]').selectOption('reportText');

    // Contains context.
    await page.locator('select[name="condition"]').selectOption('contains');
    await page.getByLabel('Enter report text').fill('the ocean is');
    let prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain context.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').fill('the ocean is');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Contains goal.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').fill('Child Safe');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain goal.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').fill('Child Safe');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Contains objective.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').fill('first meal');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain objective.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('first meal');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Contains objective tta.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('prep instruction');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain objective tta.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('prep instruction');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Contains Specialist step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('like math');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Contains Recipient step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('one small positive thought');
    prs = waitForLandingFilterRequests(page);
    await page.getByTestId('apply-filters-test-id').click();
    await Promise.all(prs);
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();
  });
});
