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

test.describe("Activity Report Text Search Filter", () => {
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
    await page.getByRole('group', { name: 'Was this activity for a recipient or other entity?' }).locator('label').filter({ hasText: 'Recipient' }).click();
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
    await page.getByRole('group', { name: 'Who requested this activity? Use "Regional Office" for TTA not requested by recipient.' }).locator('label').filter({ hasText: 'Recipient' }).click();
    // reasons
    await page.getByLabel(/Reasons/i).focus();
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await blur(page);
    
    // Start and End Dates.
    await page.getByLabel(/Start date/i).fill('12/01/2020');
    await page.getByLabel(/End date/i).fill('12/01/2050');
    // Duration.
    await page.getByLabel('Duration in hours (round to the nearest half hour)').click();
    await page.getByLabel('Duration in hours (round to the nearest half hour)').fill('9.5');
    await page.getByRole('textbox', { name: 'Context' }).locator('div').nth(2).fill('The sky is blue. The ocean is deep.');;
    // Type of tta.
    await page.getByRole('group', { name: 'What TTA was provided' }).getByText('Training').click();
    await page.getByText('In Person').click();
    await page.locator('#participants div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-11-option-0').click();
    await blur(page);
    // Number of participants.
    await page.locator('.smart-hub-activity-report > div:nth-child(2) > div').first().click();
    await page.getByLabel('Number of participants involved').click();
    await page.getByLabel('Number of participants involved').fill('5');
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // Goals page.
    await page.getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2).click();
    await page.keyboard.type('Create new goal');
    await page.keyboard.press('Enter');

    // Goal title.
    await page.getByTestId('textarea').fill('Learn how to cook.');
    await blur(page);

    // Is RTTAPA.
    await page.getByText('Yes').click();

    // Objective.
    await page.getByLabel(/Select TTA objective/i).focus();
    await page.keyboard.type('create');
    await page.keyboard.press('Enter');
    // Objective title.
    await page.getByLabel('TTA objective *').fill('Prepare your first meal.');
    await page.getByLabel(/topics/i).focus();
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
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
    await page.getByRole('group', { name: 'Specialist\'s next steps' }).getByTestId('date-picker-button').click();
    await page.getByRole('button', { name: '17 January 2023 Tuesday' }).click();
    await page.getByTestId('specialistNextSteps-button').click();
    // Specialist step 2.
    await page.getByLabel('Step 2 *').click();
    await page.getByLabel('Step 2 *').fill('If you can dream it, you can do it.');
    await page.getByTestId('date-picker-button').nth(1).click();
    await page.getByRole('button', { name: '17 January 2023 Tuesday' }).click();
    // Recipient step 1.
    await page.getByTestId('recipientNextSteps-input').click();
    await page.getByTestId('recipientNextSteps-input').fill('Just one small positive thought in the morning can change your whole day.');
    await page.getByRole('group', { name: 'Recipient\'s next steps' }).getByTestId('date-picker-button').click();
    await page.getByRole('button', { name: '17 January 2023 Tuesday' }).click();
   // Recipient step 2.
    await page.getByTestId('recipientNextSteps-button').click();
    await page.getByRole('group', { name: 'Recipient\'s next steps' }).getByLabel('Step 2 *').click();
    await page.getByRole('group', { name: 'Recipient\'s next steps' }).getByLabel('Step 2 *').fill('Virtually nothing is impossible in this world.');
    await page.getByTestId('date-picker-button').nth(3).click();
    await page.getByRole('button', { name: '17 January 2023 Tuesday' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();

  // Submit page.
  // add creator notes
  await page.getByRole('textbox', { name: 'Additional notes' }).locator('div').nth(2).click();
  await page.keyboard.type('Sample creator notes');

  const approverDropdown = page.getByLabel(/Approving manager/i)
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

  await page.waitForTimeout(1000);

  // Doesn't contain context.
  await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
  await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
  await page.getByLabel('Enter report text').fill('the ocean is');
  await page.getByTestId('apply-filters-test-id').click();
  await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

  // Contains goal.
  await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
  await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
  await page.getByLabel('Enter report text').fill('cook');
  await page.getByTestId('apply-filters-test-id').click();
  await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();

  // Doesn't contain goal.
  await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
  await page.getByRole('combobox', { name: 'condition' }).selectOption('does not contain');
  await page.getByLabel('Enter report text').fill('cook');
  await page.getByTestId('apply-filters-test-id').click();
  await expect(page.getByRole('row', { name: `R0${regionNumber}-AR-${arNumber}` })).not.toBeVisible();

   // Contains objective.
   await page.getByRole('button', { name: 'open filters for this page , 1 currently applied' }).click();
   await page.getByRole('combobox', { name: 'condition' }).selectOption('contains');
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
  });
});