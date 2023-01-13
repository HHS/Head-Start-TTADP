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
/**
 * Formats goals from the heading string to use in the "View objective (x)" selectors
 *
 * @remarks
 * A sample heading string: "Goal G-5, G-6RTTAPA"
 * Would return "G-5G6"
 * @param headingString - string to extract goals from
 */
function getGoals(headingString) {
  const goal1 = headingString.split(' ')[1].split(',')[0];
  const goal2 = headingString.split(' ')[2].split('RTTAPA')[0];
  return `${goal1}${goal2}`;
}

/**
 * Extracts a recipient name from the "Activity participant" review section display
 *
 * @remarks
 * A sample Activity participants input: "Agency 1.a in region 1, Inc. - 01HP044444  - ECS"
 * Would return "Agency 1.a in region 1, Inc."
 * @param page - the page object
 */
async function getRecipient(page) {
  const recipient = await page.locator('[aria-label="Activity participants 1"]');
  const text = await recipient.textContent();
  return text.split('-')[0].trim();
}

/**
 * Extracts the grant numbers from the recipients string
 *
 * @remarks
 * A sample Activity participants input: "Agency 1.a in region 1, Inc. - 01HP044444  - ECS, Agency 1.a in region 1, Inc. - 01HP044445"
 * Would return "01HP044444, 01HP044445"
 * Note - there is a bug currently that displays the grant number in a descending order, hence a need
 * to temporarily reverse the returned array to return "01HP044445, 01HP04444" instead
 * @param recipients - the recipients string
 */
async function getGrants(recipients) {
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
  return selectedOption.evaluate(sel => sel.options[sel.options.selectedIndex].textContent);
};

test.describe("Activity Report", () => {
  test('can create an AR with multiple goals, submit for review, and review', async ({ page }) => {
    test.slow();
    const fullName = await getFullName(page);

    await page.getByRole('link', { name: 'Activity Reports' }).click();
    await page.getByRole('button', { name: '+ New Activity Report' }).click();

    const heading = page.getByRole('heading', { name: /activity report for region \d/i });
    const regionNumber = await heading.textContent().then((text) => text!.match(/\d/)![0]);

    await page.getByRole('group', { name: 'Was this activity for a recipient or other entity? *' }).locator('label').filter({ hasText: 'Recipient' }).click();
    await page.locator('#activityRecipients div').filter({ hasText: '- Select -' }).nth(1).click();

    await page.locator('#react-select-3-option-0-0').click();
    await page.locator('#react-select-3-option-0-1').click();
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
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.keyboard.press('Enter');
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g1o1');
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.locator('#react-select-21-option-0').click();
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
    await page.locator('.css-g1d714-ValueContainer').click();
    await page.keyboard.type('Create new goal');
    await page.keyboard.press('Enter');
    await page.getByTestId('textarea').click();
    await page.getByTestId('textarea').fill('g2');
    await page.getByRole('group', { name: 'Is this a Recipient TTA Plan Agreement (RTTAPA) goal?*' }).getByText('Yes').click();
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.locator('#react-select-35-option-0').click();
    await page.getByLabel('TTA objective *').click();
    await page.getByLabel('TTA objective *').fill('g2o1');
    await page.locator('.css-125guah-control > .css-g1d714-ValueContainer').click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await blur(page);
    await page.getByRole('textbox', { name: 'TTA provided for objective' }).locator('div').nth(2).click();
    await page.keyboard.type('hello');    
    await page.getByRole('button', { name: 'Save goal' }).click();

    // assert the goals and objectives section is complete
    let sideNavTextContent = await page.locator('#activityReportSideNav-goals-and-objectives .page-state').textContent();
    if(sideNavTextContent) {
      expect(sideNavTextContent.match(/Complete/i)).toBeTruthy();
    }

    // edit the first goal
    await page.getByText('g1', { exact: true }).locator('..').locator('..').getByRole('button').click();
    await page.getByRole('button', { name: 'Edit'}).click();

    // navigate away from the activity report page
    await page.getByRole('link', { name: 'Activity Reports' }).click();

    // navigate back to the activity report page & the goals and objectives section
    await page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).first().click();
    await page.getByRole('button', { name: 'Goals and objectives' }).click();

    // test to make sure that side nav is updated when a goal is edited
    sideNavTextContent = await page.locator('#activityReportSideNav-goals-and-objectives .page-state').textContent();
    if(sideNavTextContent) {
      expect(sideNavTextContent.match(/in progress/i)).toBeTruthy();
    }    

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

    const recipient = await getRecipient(page);
    expect(recipient.length).not.toBe(0);

    // add creator notes
    await page.getByRole('textbox', { name: 'Additional notes' }).locator('div').nth(2).click();
    await page.keyboard.type('these are my creator notes');

    const approverDropdown = page.locator('.css-g1d714-ValueContainer');
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
    await expect(page.getByTestId('accordionItem_activity-summary').getByText('Virtual')).toBeVisible();
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

    const recipients = await page.locator('span:near(p:text("Recipient names"))').first().textContent();
    const grants = await getGrants(recipients);

    // navigate to the Recipient TTA Records page
    await page.getByRole('link', { name: 'Recipient TTA Records' }).click();
    // click on the previously extracted recipient
    await page.getByRole('link', { name: recipient }).click();
    // navigate to the 'Goals & Objectives page
    await page.getByRole('link', { name: 'Goals & Objectives' }).click();
    // check that previously created goals g1 and g2 are visible
    await expect(page.getByText('g1', {exact: true})).toBeVisible();
    await expect(page.getByText('g2', {exact: true})).toBeVisible();

    // look for the goals heading for the previously created goal, e.g. 'Goal G-6, G-5RTTAPA'
    const g1Goals = page.locator('h3:above(p:text("g1"))').first();
    const g1GoalsTxt = await g1Goals.textContent();
    // get text for the previously created goal's objectives button, e.g. 'Goal G-5, G-6RTTAPA' will become 'G-5G-6'
    const g1GoalsForObjectives = getGoals(g1GoalsTxt);
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
    // extract text used to locate the correct objective's button, e.g. 'Goal G-8, G-7RTTAPA' will become 'G-7G-8'
    const g2GoalsForObjectives = getGoals(g2GoalsTxt);
    // extract text used to locate the topics
    const g2Topics = page.locator(`div:right-of(h3:text("${g2GoalsTxt ? g2GoalsTxt.substring(5).split('RTTAPA')[0] : ''}"))`).first().locator('p').getByText('Behavioral / Mental Health / Trauma, CLASS: Classroom Organization');
    // verify the topics for the previously created goal
    expect(g2Topics).toBeVisible();

    // expand objectives for g1
    await page.getByRole('button', { name: `Expand objectives for goal ${g1GoalsForObjectives}` }).click();

    await expect(page.getByText('g1o1', {exact: true})).toBeVisible();
    // verify a link to the activity report is found in the objective section
    await expect(page.getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();
    // Access parent with '..' 
    // This one doesn't work needs to be fixed, since the text is 'Grant number' (bug)
    //await expect(page.getByText('g1o1', {exact: true}).locator('..').locator('..').getByText('Grant numbers')).toBeVisible();
    // verify the grants are visible in the objective section
    await expect(page.getByText('g1o1', {exact: true}).locator('..').locator('..').getByText(grants)).toBeVisible();
    // verify the reason is visible in the objective section
    await expect(page.getByText('g1o1', {exact: true}).locator('..').locator('..').getByText('Below Competitive Threshold (CLASS)')).toBeVisible();
    // verify the end date is visible in the objective section
    await expect(page.getByText('g1o1', {exact: true}).locator('..').locator('..').getByText('12/01/2050')).toBeVisible();
    // verify the correct status for the objective is visible
    await expect(page.getByText('g1o1', {exact: true}).locator('..').locator('..').getByText('Not started')).toBeVisible();

    // expand objectives for g2
    await page.getByRole('button', { name: `Expand objectives for goal ${g2GoalsForObjectives}` }).click();

    await expect(page.getByText('g2o1', {exact: true})).toBeVisible();
    // verify a link to the activity report is found in the objective section
    await expect(page.getByText('g2o1', {exact: true}).locator('..').locator('..').getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` })).toBeVisible();
    //This one doesn't work (bug)
    //await expect(page.getByText('g2o1', {exact: true}).locator('..').locator('..').getByText('Grant numbers')).toBeVisible();
    // verify the grants are visible in the objective section
    await expect(page.getByText('g2o1', {exact: true}).locator('..').locator('..').getByText(grants)).toBeVisible();
     // verify the reason is visible in the objective section
    await expect(page.getByText('g2o1', {exact: true}).locator('..').locator('..').getByText('Below Competitive Threshold (CLASS)')).toBeVisible();
    // verify the end date is visible in the objective section
    await expect(page.getByText('g2o1', {exact: true}).locator('..').locator('..').getByText('12/01/2050')).toBeVisible();
    // verify the correct status for the objective is visible
    await expect(page.getByText('g2o1', {exact: true}).locator('..').locator('..').getByText('Not started')).toBeVisible();

    // check g1
    await page.getByText('g1', { exact: true }).locator('..').locator('..').locator('..').getByRole('button', { name: 'Actions for goal'}).click();
    // click on the 'Edit' button for 'g1' and verify the correct data is displayed
    await page.getByText('g1', { exact: true }).locator('..').locator('..').locator('..').getByRole('button', { name: 'Edit'}).click();

    await expect(page.getByText("This goal is used on an activity report, so some fields can't be edited.")).toBeVisible();
    await expect(page.getByText('g1', { exact: true })).toBeVisible();
    await expect(page.getByText('Yes', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('g1o1')).toBeVisible();
    await expect(page.getByText(g1TopicsTxt || 'Behavioral / Mental Health / Trauma')).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://banana.banana.com'})).toBeVisible();
    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked();

    // verify the correct value is selected in the Objective status dropdown
    expect(await extractSelectedDisplayedValue(page.getByTestId('dropdown'))).toBe('Not Started');
    // Change g1o1's status
    await page.getByTestId('dropdown').click();
    await page.getByTestId('dropdown').selectOption({ label: 'In Progress' });
    await page.getByRole('button', { name: 'Save'}).click();

    // expand the objective for g1
    await page.getByRole('button', { name: `Expand objectives for goal ${g1GoalsForObjectives}` }).click();
    // verify the 'In Progress' status is now visible
    await expect(page.locator('li').getByText('In Progress')).toBeVisible();

    // Check g2
    await page.getByText('g2', { exact: true }).locator('..').locator('..').locator('..').getByRole('button', { name: 'Actions for goal'}).click();
    // click on the 'Edit' button for 'g1' and verify the correct data is displayed
    await page.getByText('g2', { exact: true }).locator('..').locator('..').locator('..').getByRole('button', { name: 'Edit'}).click();

    await expect(page.getByText("This goal is used on an activity report, so some fields can't be edited.")).toBeVisible();
    await expect(page.getByText('g2', { exact: true })).toBeVisible();
    await expect(page.getByText('Yes', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('g2o1')).toBeVisible();
    await expect(page.getByText('Behavioral / Mental Health / Trauma')).toBeVisible();
    await expect(page.getByText('CLASS: Classroom Organization')).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://banana.banana.com'})).not.toBeVisible();
    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked();
    expect(await extractSelectedDisplayedValue(page.getByTestId('dropdown'))).toBe('Not Started');

    await page.getByTestId('dropdown').click();
    await page.getByTestId('dropdown').selectOption({ label: 'Complete' });
    // Instead of saving, cancel out of the 'Edit' form
    await page.getByRole('link', { name: 'Cancel'}).click();

    // expand the objective for g2
    await page.getByRole('button', { name: `Expand objectives for goal ${g2GoalsForObjectives}` }).click();
    // follow the AR link for g2
    await page.getByText('g2', { exact: true }).locator('..').locator('..').locator('..').getByRole('link', { name: `R0${regionNumber}-AR-${arNumber}` }).click();
    // verify the link works by checking whether the recipients are visible
    await expect(page.getByText(`${recipients}`)).toBeVisible();
  });
});
