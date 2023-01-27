/* eslint-disable jest/no-done-callback */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
import { test, expect, Page } from '@playwright/test';
import { blur } from './common';

async function getFullName(page: Page) {
  await page.goto('/');
  const welcomeText = page.getByRole('heading', { name: /welcome to the tta hub,/i });
  const text = await welcomeText.textContent();
  return text ? text.replace(/welcome to the tta hub, /i, '') : '';
}
/**
 * Formats goals from the heading string to use in the "View objective (x)" selectors
 *
 * @remarks
 * A sample heading string: "Goal G-5, G-6RTTAPA"
 * Would return "G-5G6"
 * @param headingString - string to extract goals from
 */
function getGoals(headingString: string) {
  const goal1 = headingString.split(' ')[1].split(',')[0];
  const goal2 = headingString.split(' ')[2].split('RTTAPA')[0];
  return `${goal1}${goal2}`;
}

/**
 *
 * Given a page, returns the region number from the heading text
 *
 * @param page {Page}
 * @returns string
 */
async function getRegionNumber(page: Page) {
  const heading = page.getByRole('heading', { name: /activity report for region \d/i });
  return heading.textContent().then((text) => text?.match(/\d/)?.[0]);
}

/**
 * Extracts a recipient name from the "Activity participant" review section display
 *
 * @remarks
 * A sample Activity participants input: "Agency 1.a in region 1, Inc. - 01HP044444  - ECS"
 * Would return "Agency 1.a in region 1, Inc."
 * @param page - the page object
 */
async function getRecipient(page: Page) {
  const recipient = page.locator('[aria-label="Activity participants 1"]');
  const text = await recipient.textContent();
  return text ? text.split('-')[0].trim() : '';
}

/**
 * Extracts the grant numbers from the recipients string
 *
 * @remarks
 * A sample Activity participants input: "Agency 1.a in region 1, Inc. - 01HP044444  - 
 * ECS, Agency 1.a in region 1, Inc. - 01HP044445"
 * Would return "01HP044444, 01HP044445"
 * Note - there is a bug currently that displays the grant number in a descending order, 
 * hence a need
 * to temporarily reverse the returned array to return "01HP044445, 01HP04444" instead
 * @param recipients - the recipients string
 */
async function getGrants(recipients: string) {
  const recArray = recipients.split(', ');
  // remove potential elements without grant numbers
  const recArrayGrants = recArray.filter((el) => el.indexOf(' - ') > 0);
  const grants = recArrayGrants.map((r) => r.split('-')[1].trim());

  // Need to reverse temporarily (bug)
  const temp = grants.reverse();
  return temp.toString().replace(',', ', ');
}

/**
 * Extracts the text of the dropdown's selected value
 *
 * @param selectedOption - dropdown
 */
async function extractSelectedDisplayedValue(selectedOption) {
  return selectedOption.evaluate((sel) => sel.options[sel.options.selectedIndex].textContent);
}

async function createNewObjective(page: Page) {
  await page.getByText(/Select TTA objective/i).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
}

/**
 *
 * @param page {Page}
 * @param recipients {number} how many recipients to select, starting at the top of the list
 */
async function activitySummary(page: Page, recipients = 2) {
  await page.getByRole('group', { name: 'Was this activity for a recipient or other entity? *' }).locator('label').filter({ hasText: 'Recipient' }).click();
  await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();
  await page.keyboard.press('ArrowDown');

  // select recipients
  for (let i = 0; i < recipients; i++) {
    await page.keyboard.press('Enter');
  }

  await blur(page);
  await page.locator('#targetPopulations input').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await blur(page);

  await page.getByRole('group', { name: 'Who requested this activity? Use "Regional Office" for TTA not requested by recipient. *' }).locator('label').filter({ hasText: 'Regional Office' }).click();
  await page.getByRole('group', { name: 'Reason for activity' }).getByTestId('label').click();
  await page.keyboard.type('Change in scope');
  await page.keyboard.press('Enter');
  await blur(page);
  await page.getByLabel('Start date *mm/dd/yyyy').fill('12/01/2020');
  await page.getByLabel('End date *mm/dd/yyyy').fill('12/01/2050');
  await page.getByLabel('Duration in hours (round to the nearest half hour) *').fill('5');
  await page.getByRole('group', { name: 'What TTA was provided *' }).getByText('Training').click();
  await page.getByText('Virtual').click();
  await page.getByText('Video').click();
  await page.locator('#participants input').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await blur(page);
  await page.getByLabel('Number of participants involved *').fill('5');
}

async function nextSteps(page: Page) {
  // fill out next steps
  await page.getByTestId('specialistNextSteps-input').click();
  await page.getByTestId('specialistNextSteps-input').fill('1');
  await page.getByLabel('When do you anticipate completing step 1? *').click();
  await page.getByLabel('When do you anticipate completing step 1? *').fill('12/01/2050');
  await page.getByTestId('recipientNextSteps-input').click();
  await page.getByTestId('recipientNextSteps-input').fill('2');
  await page.getByLabel('When does the recipient anticipate completing step 1? *').click();
  await page.getByLabel('When does the recipient anticipate completing step 1? *').fill('12/01/2050');
}

test.describe('Activity Report', () => {
  test('can create an AR with multiple goals, submit for review, and review', async ({ page }) => {
    const fullName = await getFullName(page);

    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    const regionNumber = await getRegionNumber(page);

    await activitySummary(page);

    await page.getByRole('button', { name: 'Save and continue' }).click();

    await page.getByRole('button', { name: 'Supporting attachments not started' }).click();
    await page.getByRole('button', { name: 'Goals and objectives not started' }).click();

    // create the first goal
    await page.getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2)
      .click();
    await page.locator('#react-select-15-option-0').getByText('Create new goal').click();
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g1');
    await page.getByText('Yes').click();
    await page.getByRole('button', { name: 'Save goal' }).click();

    await createNewObjective(page);
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g1o1');
    await page.getByLabel(/Topics/i).focus();
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
    await page.getByLabel(/select recipient's goal/i).focus();
    await page.keyboard.type('Create new goal');
    await page.keyboard.press('Enter');
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g2');
    await page.getByRole('group', { name: 'Is this a Recipient TTA Plan Agreement (RTTAPA) goal?*' }).getByText('Yes').click();
    await createNewObjective(page);
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g2o1');
    await page.getByLabel(/Topics/i).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await blur(page);
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.keyboard.type('hello');
    await page.getByRole('button', { name: 'Save goal' }).click();

    // edit the first goal
    await page.getByText('g1', { exact: true }).locator('..').locator('..').getByRole('button')
      .click();
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

    await nextSteps(page);

    // move to review and submit
    await page.getByRole('button', { name: 'Save and continue' }).click();

    const recipient = await getRecipient(page);
    expect(recipient.length).not.toBe(0);

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

    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Recipient', { exact: true })).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Regional Office', { exact: true })).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Training', { exact: true })).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Virtual', { exact: true })).toBeVisible();
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Virtual')).toBeVisible();
    await expect(page.getByText('Recipient or other entity', { exact: true })).toBeVisible();
    await expect(page.getByText('Activity participants', { exact: true })).toBeVisible();
    await expect(page.getByText('Collaborating specialists', { exact: true })).toBeVisible();
    await expect(page.getByText('Target populations addressed', { exact: true })).toBeVisible();
    await expect(page.getByText('TTA provided', { exact: true })).toBeVisible();

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

    const recipients = await page.locator('span:near(p:text("Recipient names"))').first().textContent();
    const grants = await getGrants(recipients || '');

    // navigate to the Recipient TTA Records page
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    // click on the previously extracted recipient
    await page.getByRole('link', { name: recipient }).click();
    // navigate to the 'Goals & Objectives page
    await page.getByRole('link', { name: 'Goals & Objectives' }).click();
    // check that previously created goals g1 and g2 are visible
    await expect(page.getByText('g1', { exact: true })).toBeVisible();
    await expect(page.getByText('g2', { exact: true })).toBeVisible();

    // look for the goals heading for the previously created goal, e.g. 'Goal G-6, G-5RTTAPA'
    const g1Goals = page.locator('h3:above(p:text("g1"))').first();
    const g1GoalsTxt = await g1Goals.textContent();
    // get text for the previously created goal's objectives button,
    // e.g. 'Goal G-5, G-6RTTAPA' will become 'G-5G-6'
    const g1GoalsForObjectives = getGoals(g1GoalsTxt || '');
    // strip 'Goals' and 'RTTAPA' from g1GoalsTxt: e.g "Goal G-5, G-6RTTAPA" will become "G-5, G-6"
    const g1GoalsForSelector = g1GoalsTxt ? g1GoalsTxt.substring(5).split('RTTAPA')[0] : '';
    // use the correct text to locate the topics, e.g. "G-5, G-6"
    const g1Topics = page.locator(`div:right-of(h3:text("${g1GoalsForSelector}"))`).first().locator('p').last();
    const g1TopicsTxt = await g1Topics.textContent();
    // verify the topics for the previously created goal
    expect(g1TopicsTxt).toBe('Behavioral / Mental Health / Trauma');
    // look for the goals heading for the previously created goal, e.g. 'Goal G-8, G-7RTTAPA'
    const g2Goals = page.locator('h3:above(p:text("g2"))').first();
    const g2GoalsTxt = await g2Goals.textContent();
    // extract text used to locate the correct objective's button,
    // e.g. 'Goal G-8, G-7RTTAPA' will become 'G-7G-8'
    const g2GoalsForObjectives = getGoals(g2GoalsTxt || '');
    // extract text used to locate the topics
    const g2Topics = page.locator(`div:right-of(h3:text("${g2GoalsTxt ? g2GoalsTxt.substring(5).split('RTTAPA')[0] : ''}"))`).first().locator('p').getByText('Behavioral / Mental Health / Trauma, CLASS: Classroom Organization');
    // verify the topics for the previously created goal
    expect(g2Topics).toBeVisible();

    // expand objectives for g1
    await page.getByRole('button', { name: `Expand objectives for goal ${g1GoalsForObjectives}` }).click();

    await expect(page.getByText('g1o1', { exact: true })).toBeVisible();
    // verify a link to the activity report is found in the objective section
    await expect(page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();
    // Access parent with '..'
    await expect(page.getByText('g1o1', { exact: true }).locator('..').locator('..').getByText('Grant numbers')).toBeVisible();
    // verify the grants are visible in the objective section
    await expect(page.getByText('g1o1', { exact: true }).locator('..').locator('..').getByText(grants)).toBeVisible();
    // verify the reason is visible in the objective section
    const goalOneContent = await page.getByText('g1o1', { exact: true }).locator('..').locator('..').textContent();
    expect(goalOneContent).toContain('Change in Scope');
    // verify the end date is visible in the objective section
    await expect(page.getByText('g1o1', { exact: true }).locator('..').locator('..').getByText('12/01/2050')).toBeVisible();
    // verify the correct status for the objective is visible
    await expect(page.getByText('g1o1', { exact: true }).locator('..').locator('..').getByText('Not started')).toBeVisible();

    // expand objectives for g2
    await page.getByRole('button', { name: `Expand objectives for goal ${g2GoalsForObjectives}` }).click();

    await expect(page.getByText('g2o1', { exact: true })).toBeVisible();
    // verify a link to the activity report is found in the objective section
    await expect(page.getByText('g2o1', { exact: true }).locator('..').locator('..').getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();
    await expect(page.getByText('g2o1', { exact: true }).locator('..').locator('..').getByText('Grant numbers')).toBeVisible();
    // verify the grants are visible in the objective section
    await expect(page.getByText('g2o1', { exact: true }).locator('..').locator('..').getByText(grants)).toBeVisible();
    const goalTwoContent = await page.getByText('g2o1', { exact: true }).locator('..').locator('..').textContent();
    expect(goalTwoContent).toContain('Change in Scope');
    // verify the end date is visible in the objective section
    await expect(page.getByText('g2o1', { exact: true }).locator('..').locator('..').getByText('12/01/2050')).toBeVisible();
    // verify the correct status for the objective is visible
    await expect(page.getByText('g2o1', { exact: true }).locator('..').locator('..').getByText('Not started')).toBeVisible();

    // check g1
    await page.getByText('g1', { exact: true }).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
    // click on the 'Edit' button for 'g1' and verify the correct data is displayed
    await page.getByText('g1', { exact: true }).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Edit' })
      .click();

    await expect(page.getByText("This goal is used on an activity report, so some fields can't be edited.")).toBeVisible();
    await expect(page.getByText('g1', { exact: true })).toBeVisible();
    await expect(page.getByText('Yes', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('g1o1')).toBeVisible();
    await expect(page.getByText(g1TopicsTxt || 'Behavioral / Mental Health / Trauma')).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://banana.banana.com' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked();

    // verify the correct value is selected in the Objective status dropdown
    expect(await extractSelectedDisplayedValue(page.getByTestId('dropdown'))).toBe('Not Started');
    // Change g1o1's status
    await page.getByTestId('dropdown').click();
    await page.getByTestId('dropdown').selectOption({ label: 'In Progress' });
    await page.getByRole('button', { name: 'Save' }).click();

    // expand the objective for g1
    await page.getByRole('button', { name: `Expand objectives for goal ${g1GoalsForObjectives}` }).click();
    // verify the 'In Progress' status is now visible
    await expect(page.getByRole('listitem').filter({ hasText: 'Objective status In progress' })).toBeVisible();

    // Check g2
    await page.getByText('g2', { exact: true }).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Actions for goal' })
      .click();
    // click on the 'Edit' button for 'g1' and verify the correct data is displayed
    await page.getByText('g2', { exact: true }).locator('..').locator('..').locator('..')
      .getByRole('button', { name: 'Edit' })
      .click();

    await expect(page.getByText("This goal is used on an activity report, so some fields can't be edited.")).toBeVisible();
    await expect(page.getByText('g2', { exact: true })).toBeVisible();
    await expect(page.getByText('Yes', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('g2o1')).toBeVisible();
    await expect(page.getByText('Behavioral / Mental Health / Trauma')).toBeVisible();
    await expect(page.getByText('CLASS: Classroom Organization')).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://banana.banana.com' })).not.toBeVisible();
    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked();
    expect(await extractSelectedDisplayedValue(page.getByTestId('dropdown'))).toBe('Not Started');

    await page.getByTestId('dropdown').click();
    await page.getByTestId('dropdown').selectOption({ label: 'Complete' });
    // Instead of saving, cancel out of the 'Edit' form
    await page.getByRole('link', { name: 'Cancel' }).click();

    // expand the objective for g2
    await page.getByRole('button', { name: `Expand objectives for goal ${g2GoalsForObjectives}` }).click();
    // follow the AR link for g2
    await page.getByText('g2', { exact: true }).locator('..').locator('..').locator('..')
      .getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` })
      .click();
    // verify the link works by checking whether the recipients are visible
    await expect(page.getByText(`${recipients}`)).toBeVisible();
  });

  test('switching objectives properly clears all fields', async ({ page }) => {
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
    await page.getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2)
      .click();
    await page.locator('#react-select-13-option-0').getByText('Create new goal').click();
    await page.getByTestId('textarea').fill('test goal 1');
    await page.getByTestId('form').getByText('No').click();

    // create a new objective
    await createNewObjective(page);
    await page.getByLabel('TTA objective *').fill('test objective 1');

    // select a topic
    await page.getByLabel(/Topics/i).focus();
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
    await page.getByTestId('label').locator('div').filter({ hasText: '- Select -' }).nth(2)
      .click();
    await page.locator('#react-select-21-option-0').getByText('Create new goal').click();
    await page.getByTestId('textarea').fill('Test goal 2');
    await page.getByRole('group', { name: 'Is this a Recipient TTA Plan Agreement (RTTAPA) goal?*' }).getByText('No').click();

    // create a new objective
    await createNewObjective(page);
    await page.getByLabel('TTA objective *').fill('test objective 2');

    // select topics
    await page.getByLabel(/Topics/i).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // enter tta provided
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).fill('TTA was provided');
    await page.getByRole('button', { name: 'Save goal' }).click();

    // edit the first goal
    await page.getByTestId('ellipsis-button').first().click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // confirm the resource is loaded back in to the form
    let resource = page.getByTestId('textInput');
    expect(resource).toHaveValue('https://www.test.gov');

    // edit the second goal
    await page.getByTestId('ellipsis-button').last().click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // confirm the resources are empty on the second objective
    resource = page.getByTestId('textInput');
    expect(resource).toHaveValue('');
    await page.getByRole('button', { name: 'Save goal' }).click();
  });

  test('multi recipient goal used on an AR', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    const fullName = await getFullName(page);

    // navigate to the RTR, select a recipient, and click add new goal
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    await page.getByRole('link', { name: 'Agency 1.a in region 1, Inc.' }).click();
    await page.getByRole('link', { name: 'Goals & Objectives' }).click();
    await page.getByRole('link', { name: 'Add new goals' }).click();

    // select recipients
    await page.getByLabel(/recipient grant numbers/i).focus();
    // both of the top recipients
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // enter goal name
    await page.getByTestId('textarea').fill('This is a goal for multiple grants');

    // it's an rttapa goal
    await page.getByText('Yes').click();

    // goal end date
    await page.getByLabel(/anticipated close date/i).fill('01/01/2023');

    // add new objective
    await page.getByRole('button', { name: 'Add new objective' }).click();

    // objective title
    await page.getByLabel('TTA objective *').fill('A new objective');

    // objective topic
    await page.getByLabel(/topics/i).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // save goal
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await page.getByRole('button', { name: 'Submit goal' }).click();

    // confirm goal is in RTR
    await expect(page.getByText('This is a goal for multiple grants')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Goal G-(\d), G-(\d)RTTAPA/i }).last()).toBeVisible();

    // navigate to the AR page
    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    await activitySummary(page, 3);

    const regionNumber = await getRegionNumber(page);

    await page.getByRole('button', { name: 'Save and continue' }).click();

    // fill out the goals page
    await page.getByLabel(/Select recipient's goal/i).focus();
    await page.keyboard.type('This is a goal for multiple grants');
    await page.keyboard.press('Enter');
    await page.getByLabel(/select tta objective/i).focus();
    await page.keyboard.type('A new objective');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).focus();
    await page.keyboard.type('This is a TTA provided for objective');
    await page.getByTestId('dropdown').selectOption('In Progress');
    await page.getByRole('button', { name: 'Save goal' }).click();
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // skip supporting attachments
    await page.getByRole('button', { name: 'Save and continue' }).click();

    // fill out next steps
    await nextSteps(page);
    await page.getByRole('button', { name: 'Save and continue' }).click();

    const approverDropdown = page.locator('.css-g1d714-ValueContainer');
    await approverDropdown.click();

    // type our name into the dropdown to filter to just us
    await page.keyboard.type(fullName);
    // press Enter to select ourself
    await page.keyboard.press('Enter');

    await blur(page);

    const url = page.url();
    const arNumber = url.split('/').find((part) => /^\d+$/.test(part));

    // submit for approval
    await page.getByRole('button', { name: 'Submit for approval' }).click();
    await page.waitForTimeout(5000);

    // find the recently created AR in the table and navigate to it
    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();

    // set status to approved
    await page.getByTestId('dropdown').selectOption('approved');

    // submit approval
    await page.getByTestId('form').getByTestId('button').click();

    // check first recipient
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    await page.getByRole('link', { name: 'Agency 1.a in region 1, Inc.' }).click();
    await page.getByRole('link', { name: 'Goals & Objectives' }).click();

    // confirm goal is in RTR
    await expect(page.getByText('This is a goal for multiple grants')).toBeVisible();

    // check second recipient
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    await page.getByRole('link', { name: 'Agency 2 in region 1, Inc.' }).click();
    await page.getByRole('link', { name: 'Goals & Objectives' }).click();
    await expect(page.getByText('This is a goal for multiple grants')).toBeVisible();
    await page.getByRole('button', { name: /Expand objectives for goal G-(\d)/i }).click();
    await expect(page.getByText('A new objective')).toBeVisible();
    await expect(page.getByText(`Activity reports R01-AR-${arNumber}`)).toBeVisible();
  });
});
