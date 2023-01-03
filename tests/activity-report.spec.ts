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

async function createNewObjective(page) {
  await page.getByText(/Select TTA objective/i).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
}

test.describe("Activity Report", () => {
  test('can create an AR with multiple goals, submit for review, and review', async ({ page }) => {
    const fullName = await getFullName(page);

    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    const heading = page.getByRole('heading', { name: /activity report for region \d/i });
    const regionNumber = await heading.textContent().then((text) => text!.match(/\d/)![0]);

    await page.getByRole('group', { name: 'Was this activity for a recipient or other entity? *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-3-option-0-0').click();
    await blur(page);
    await page.locator('#targetPopulations div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-7-option-0').click();
    await blur(page);
    await page.getByRole('group', { name: 'Who requested this activity? Use "Regional Office" for TTA not requested by recipient. *' }).locator('label').filter({ hasText: 'Regional Office' }).click();
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

    await page.getByRole('button', { name: 'Supporting attachments not started' }).click(); 
    await page.getByRole('button', { name: 'Goals and objectives not started' }).click(); 

    // create the first goal
    await page.getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2).click();
    await page.locator('#react-select-15-option-0').getByText('Create new goal').click();
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g1');
    await page.getByText('Yes').click();
    await page.getByRole('button', { name: 'Save goal' }).click();
   
    await createNewObjective(page);
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g1o1');
    await page.getByLabel(/Topics/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);

    // save draft doesn't work with invalid resources
    await page.getByRole('textbox', { name: 'Resource 1' }).fill('banana banana banana');
    await page.getByRole('button', { name: 'Save draft' }).click();

    await expect(page.getByText('Enter one resource per field. Valid resource links must start with http:// or https://')).toBeVisible();

    await page.getByRole('textbox', { name: 'Resource 1' }).clear();
    await page.getByRole('textbox', { name: 'Resource 1' }).fill('https://banana.banana.com');

    // save draft does work with valid resources
    await page.getByRole('button', { name: 'Save draft' }).click();

    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.keyboard.type('hello');

    await page.getByRole('button', { name: 'Save draft' }).click();
    // navigate away
    await page.getByRole('button', { name: 'Supporting attachments' }).click();

    // navigate back
    await page.getByRole('button', { name: 'Goals and objectives' }).click();

    // confirm tta provided is still there (form is still open)
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).click();

    // save goal and go on to create second goal
    await page.getByRole('button', { name: 'Save goal' }).click();

    // extract the AR number from the URL:
    const url = page.url();
    const arNumber = url.split('/').find((part) => /^\d+$/.test(part));

    // create the second goal
    await page.getByRole('button', { name: 'Add new goal' }).click();
    await page.getByLabel(/select recipient's goal/i).click();
    await page.keyboard.type('Create new goal');
    await page.keyboard.press('Enter');
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g2');
    await page.getByRole('group', { name: 'Is this a Recipient TTA Plan Agreement (RTTAPA) goal?*' }).getByText('Yes').click();
    await createNewObjective(page);
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g2o1');
    await page.getByLabel(/Topics/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await blur(page);
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.keyboard.type('hello');    
    await page.getByRole('button', { name: 'Save goal' }).click();

    // edit the first goal
    await page.getByTestId('ellipsis-button').first().click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // navigate away from the activity report page
    await page.getByRole('link', { name: 'Activity Reports' }).click();

    // navigate back to the activity report page & the goals and objectives section
    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();
    await page.getByRole('button', { name: 'Goals and objectives' }).click();

    // save the first goal   
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

    const approverDropdown = page.getByLabel(/Approving manager/i);
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
    await expect(page.getByText(`${fullName} has requested approval for this activity report`)).toBeVisible();
    await expect(page.getByTestId('accordionButton_activity-summary')).toHaveText('Activity summary');
    
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Recipient', {exact: true})).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Regional Office', {exact: true})).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Training', {exact: true})).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Virtual', {exact: true})).toBeVisible();
    await expect(page.getByText('Recipient or other entity', {exact: true})).toBeVisible();
    await expect(page.getByText('Activity participants', {exact: true})).toBeVisible();
    await expect(page.getByText('Collaborating specialists', {exact: true})).toBeVisible();
    await expect(page.getByText('Target populations addressed', {exact: true})).toBeVisible();
    await expect(page.getByText('TTA provided', {exact: true})).toBeVisible();

    await expect(page.getByText('Goal: g1')).toBeVisible();
    await expect(page.getByText('Objective: g1o1')).toBeVisible();
    await expect(page.getByText('Goal: g2')).toBeVisible();
    await expect(page.getByText('Objective: g2o1')).toBeVisible();
    await expect(page.getByText(/these are my creator notes/i)).toBeVisible();
    // end review assertions

    // add manager notes
    await page.getByRole('textbox', { name: 'Manager notes' }).locator('div').nth(2).click();
    await page.keyboard.type('these are my manager notes');

    // set status to approved
    await page.getByTestId('dropdown').selectOption('approved');

    // submit approval
    await page.getByTestId('form').getByTestId('button').click();

    // this is in the 'approved activity reports' table
    await page.getByRole('rowheader', { name: `R0${regionNumber}-AR-${arNumber}` }).click();

    await expect(page.getByRole('heading', { name: `TTA activity report R0${regionNumber}-AR-${arNumber}` })).toBeVisible();
    await expect(page.getByText(/date approved/i)).toBeVisible();
    await expect(page.getByText(/these are my manager notes/i)).toBeVisible();
  });

  test('switching objectives properly clears all fields', async ({ page}) => {
    await page.goto('http://localhost:3000/');
    // create a new report
    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    // select a recipient
    await page.getByRole('group', { name: 'Was this activity for a recipient or other entity? *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();
    await page.locator('#react-select-3-option-0-0').click();

    // navigate to the goals and objectives page
    await page.getByRole('button', { name: 'Goals and objectives Not Started' }).click();

    // create a new goal
    await page.getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2).click();
    await page.locator('#react-select-13-option-0').getByText('Create new goal').click();
    await page.getByTestId('textarea').fill('test goal 1');
    await page.getByTestId('form').getByText('No').click();

    // create a new objective
    await createNewObjective(page);
    await page.getByLabel('TTA objective *').fill('test objective 1');

    // select a topic
    await page.getByLabel(/Topics/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await blur(page);

    // add a link to the first goal/first objective
    await page.getByLabel('Resource 1').fill('https://www.test.gov');

    // add TTA
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).fill('TTA was provided');

    // save and create a new goal
    await page.getByRole('button', { name: 'Save goal' }).click();
    await page.getByRole('button', { name: 'Add new goal' }).click();

    // create another new goal
    await page.getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2).click();
    await page.locator('#react-select-21-option-0').getByText('Create new goal').click();
    await page.getByTestId('textarea').fill('Test goal 2');    
    await page.getByRole('group', { name: 'Is this a Recipient TTA Plan Agreement (RTTAPA) goal?*' }).getByText('No').click();

    // create a new objective
    await createNewObjective(page);   
    await page.getByLabel('TTA objective *').fill('test objective 2');

    // select topics
    await page.getByLabel(/Topics/i).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // enter tta provided
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).fill('TTA was provided');
    await page.getByRole('button', { name: 'Save goal' }).click();

    await page.getByTestId('ellipsis-button').first().click();
    await page.getByRole('button', { name: 'Edit' }).click();

    let resource = page.getByTestId('textInput');
    expect(resource).toHaveValue('https://www.test.gov');

    await page.getByTestId('ellipsis-button').last().click();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForTimeout(10000);

    resource = page.getByTestId('textInput');    
    expect(resource).toHaveValue('');
    await page.getByRole('button', { name: 'Save goal' }).click();
  });
});
