import { test, expect } from '@playwright/test';

async function blur(page) {
  await page.getByText('Office of Head Start TTA Hub').click();
}

async function getFullName(page) {
  await page.goto('/');
  const welcomeText = await page.getByRole('heading', { name: /welcome to the tta hub/i });
  const text = await welcomeText.textContent();
  return text.replace(/welcome to the tta hub /i, '');
}

test.describe("Activity Report", () => {
  test('can create an AR with multiple goals, submit for review, and review', async ({ page }) => {
    const fullName = await getFullName(page);

    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    const heading = await page.getByRole('heading', { name: /activity report for region \d/i });
    const regionNumber = await heading.textContent().then((text) => text!.match(/\d/)![0]);

    await page.getByRole('group', { name: 'Was this activity for a recipient or other entity? *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-3-option-0-0').click();
    await blur(page);
    await page.locator('#targetPopulations div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-7-option-0').click();
    await blur(page);
    await page.getByRole('group', { name: 'Who requested this activity? Use "Regional Office" for TTA not requested by recipient. *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.getByRole('group', { name: 'Reason for activity' }).getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2).click();
    await page.locator('#react-select-9-option-0').click();
    await blur(page);
    await page.getByLabel('Start date *mm/dd/yyyy').click();
    await page.getByLabel('Start date *mm/dd/yyyy').fill('12/01/2020');
    await page.getByLabel('End date *mm/dd/yyyy').click();
    await page.getByLabel('End date *mm/dd/yyyy').fill('12/01/2050');
    await page.getByLabel('Duration in hours (round to the nearest half hour) *').click();
    await page.getByLabel('Duration in hours (round to the nearest half hour) *').fill('5');
    await page.getByRole('group', { name: 'What TTA was provided *' }).getByText('Training').click();
    await page.getByText('Virtual').click();
    await page.getByText('Video').click();
    await page.locator('#participants div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-11-option-0').click();
    await blur(page);
    await page.getByLabel('Number of participants involved *').click();
    await page.getByLabel('Number of participants involved *').fill('5');
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // create the first goal
    await page.getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2).click();
    await page.locator('#react-select-15-option-0').getByText('Create new goal').click();
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g1');
    await page.getByText('Yes').click();
    await page.getByRole('button', { name: 'Save goal' }).click();
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.keyboard.press('Enter');
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g1o1');
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.locator('#react-select-21-option-0').click();
    await blur(page);
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.keyboard.type('hello');
    await page.getByRole('button', { name: 'Save goal' }).click();

    // extract the AR number from the URL:
    const url = await page.url();
    const arNumber = url.split('/').find((part) => /^\d+$/.test(part));

    // create the second goal
    await page.getByRole('button', { name: 'Add new goal' }).click();
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g2');
    await page.getByRole('group', { name: 'Is this a Recipient TTA Plan Agreement (RTTAPA) goal?*' }).getByText('Yes').click();
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.locator('#react-select-25-option-0').click();
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g2o1');
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.keyboard.press('Enter');
    await blur(page);
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.keyboard.type('hello');
    await page.getByRole('button', { name: 'Save goal' }).click();

    // move to next steps
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // continue from supporting attachments
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // fill out next steps
    await page.getByTestId('specialistNextSteps-input').click();
    await page.getByTestId('specialistNextSteps-input').fill('1');
    await page.getByLabel('When do you anticipate completing step 1? *').click();
    await page.getByLabel('When do you anticipate completing step 1? *').fill('12/01/2050');
    await page.getByTestId('recipientNextSteps-input').click();
    await page.getByTestId('recipientNextSteps-input').fill('2');
    await page.getByLabel('When does the recipient anticipate completing step 1? *').click();
    await page.getByLabel('When does the recipient anticipate completing step 1? *').fill('12/01/2050');

    // move to review and submit
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // add creator notes
    await page.getByRole('textbox', { name: 'Additional notes' }).locator('div').nth(2).click();
    await page.keyboard.type('these are my creator notes');

    const approverDropdown = await page.locator('.css-g1d714-ValueContainer');
    await approverDropdown.click();

    // type our name into the dropdown to filter to just us
    await page.keyboard.type(fullName);

    // press Enter to select ourself
    await page.keyboard.press('Enter');

    await blur(page);

    // submit for approval
    await page.getByRole('button', { name: 'Submit for approval' }).click();

    await page.waitForTimeout(5000);

    // find the recently created AR in the table and navigate to it
    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();

    // begin review assertions
    expect(await page.getByText(`${fullName} has requested approval for this activity report`)).toBeTruthy();
    expect(await page.getByTestId('accordionButton_activity-summary')).toHaveText('Activity summary');
    expect(await page.getByText('g1')).toBeTruthy();
    expect(await page.getByText('g1o1')).toBeTruthy();
    expect(await page.getByText('g2')).toBeTruthy();
    expect(await page.getByText('g2o1')).toBeTruthy();
    expect(await page.getByText(/these are my creator notes/i)).toBeTruthy();
    // end review assertions

    // add manager notes
    await page.getByRole('textbox', { name: 'Manager notes' }).locator('div').nth(2).click();
    await page.keyboard.type('these are my manager notes');

    // set status to approved
    await page.getByTestId('dropdown').selectOption('approved');

    // submit approval
    await page.getByTestId('form').getByTestId('button').click();

    // this is in the 'approved activity reports' table
    await page.getByRole('rowheader', { name: `R0${regionNumber}-AR-${arNumber}` }).getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).click();


    await page.getByRole('heading', { name: `TTA activity report R0${regionNumber}-AR-${arNumber}` });
    expect(await page.getByText(/date approved/i)).toBeTruthy();
    expect(await page.getByText(/these are my manager notes/i)).toBeTruthy();
  });
});
