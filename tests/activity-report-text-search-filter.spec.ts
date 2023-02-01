import { test, expect } from '@playwright/test';

async function blur(page) {
  await page.getByText('Office of Head Start TTA Hub').click();
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
    await page.getByRole('button', { name: '+ New Activity Report' }).click();
    const heading = page.getByRole('heading', { name: /activity report for region \d/i });
    const regionNumber = await heading.textContent().then((text) => text!.match(/\d/)![0]);

    // Summary page.

    // Recipient.
    await page.getByRole('group', { name: 'Was this activity for a recipient or other entity? *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-3-option-0-0').click();
    await blur(page);
    // Collaborator.
    await page.locator('#activityReportCollaborators div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-5-option-2').click();
    await blur(page);
    // Target population.
    await page.locator('#targetPopulations div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-7-option-0').click();
    await blur(page);
    // Requested by.
    await page.getByRole('group', { name: 'Who requested this activity? Use "Regional Office" for TTA not requested by recipient. *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.getByRole('group', { name: 'Reason for activity' }).getByText('- Select -').click();
    await page.locator('#react-select-9-option-0').click();
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
    await page.getByText('In Person').click();
    await page.locator('#participants div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-11-option-0').click();
    await blur(page);
    // Number of participants.
    await page.locator('.smart-hub-activity-report > div:nth-child(2) > div').first().click();
    await page.getByLabel('Number of participants involved *').click();
    await page.getByLabel('Number of participants involved *').fill('5');
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // Goals page.
    await page.getByText('- Select -').click();
    await page.locator('#react-select-13-option-0').getByText('Create new goal').click();

    // Goal title.
    await page.getByTestId('textarea').click();
    await page.keyboard.type('Learn how to cook.');
    // await page.getByTestId('textarea').fill('Learn how to cook.');
    await blur(page);

    // Is RTTAPA.
    await page.getByText('Yes').click();

    // Objective.
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.locator('#react-select-15-option-0').click();
    // Objective title.
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('Prepare your first meal.');
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.locator('#react-select-19-option-0').click();
    await blur(page);
    // Links.
    await page.getByTestId('textInput').click();
    await page.getByTestId('textInput').fill('https://test1.gov');
    // TTA provided.
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).fill('Basic prep instruction.');
    await page.getByRole('button', { name: 'Save goal' }).click();
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
    await page.getByLabel('Step 2 *').fill('If you can dream it, you can do it.');
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
    const approverDropdown = page.locator('.css-g1d714-ValueContainer');
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

    await page.waitForTimeout(5000);

    // Report text filter search.
    await page.getByRole('button', { name: 'open filters for this page' }).click();

    // Add report text filter.
    await page.locator('select[name="topic"]').selectOption('reportText');

    // Contains context.
    await page.locator('select[name="condition"]').selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('the ocean is');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain context.
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('the ocean is');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Contains goal.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('cook');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain goal.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('cook');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Contains objective.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('first meal');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain objective.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('first meal');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Contains objective tta.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('prep instruction');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain objective tta.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('prep instruction');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Contains Specialist step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('you can dream it');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain Specialist step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('you can dream it');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Contains Recipient step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('one small positive thought');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    // Doesn't contain Recipient step.
    await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('one small positive thought');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Mix with Report ID.
    await page.getByRole('button', { name: 'open filters for this page' }).click();
    await page.getByRole('button', { name: 'remove Report text does not contain one small positive thought filter. click apply filters to make your changes' }).click();
    await page.getByRole('button', { name: 'Add new filter' }).click();
    await page.locator('select[name="topic"]').selectOption('reportText');
    await page.locator('select[name="condition"]').selectOption('contains');
    await page.getByLabel('Enter report text').click();
    await page.getByLabel('Enter report text').fill('ocean');

    await page.getByRole('button', { name: 'Add new filter' }).click();
    await page.getByRole('combobox', { name: 'topic' }).nth(1).selectOption('reportId');
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('contains');
    await page.getByLabel('Enter a report id').click();
    await page.getByLabel('Enter a report id').fill(`${arNumber}`);
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    await page.getByRole('button', { name: 'open filters for this page' }).click();
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('does not contain');
    await page.getByLabel('Enter a report id').click();
    await page.getByLabel('Enter a report id').fill(`${arNumber}`);
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Mix with Reasons.
    await page.getByRole('button', { name: 'open filters for this page , 2 currently applied' }).click();
    await page.getByRole('combobox', { name: 'topic' }).nth(1).selectOption('reason');
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('is');
    await page.getByText('Select reasons to filter by').click();
    await page.keyboard.press('Enter');
    await page.getByTestId('apply-filters-test-id').click();
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    await page.getByRole('button', { name: 'open filters for this page , 2 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('is not');
    await page.getByText('Select reasons to filter by').click();
    await page.keyboard.press('Enter');
    await page.getByTestId('apply-filters-test-id').click();
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

    // Mix with Start Date
    await page.getByRole('button', { name: 'open filters for this page , 2 currently applied' }).click();
    await page.getByRole('combobox', { name: 'topic' }).nth(1).selectOption('startDate');
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('is');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

    await page.getByRole('button', { name: 'open filters for this page , 2 currently applied' }).click();
    await page.getByRole('combobox', { name: 'condition' }).nth(1).selectOption('is on or before');
    await page.getByTestId('date-picker-external-input').click();
    await page.getByTestId('date-picker-external-input').fill('01/15/2023');
    await page.getByTestId('apply-filters-test-id').click();
    await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();
  });
});
