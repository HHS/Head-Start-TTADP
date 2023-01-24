import { test, expect } from '@playwright/test';

test('only allows access to correct regions despite shared url', async ({ page }) => {
  // this user only has access to region 1
  await page.goto('http://localhost:3000/activity-reports?region.in[]=1&region.in[]=2&region.in[]=3&region.in[]=4&region.in[]=5&region.in[]=6&region.in[]=7&region.in[]=8&region.in[]=9&region.in[]=10&region.in[]=11&region.in[]=12');

  // this button confirms the modal is open and the regions have been checked vs the user's permissions
  // no action is possible except making a selection on the modal
  await page.getByRole('button', { name: 'Show filter with my regions' }).click();

  // assert correct url 
  expect(page.url()).toBe('http://localhost:3000/activity-reports?region.in[]=1')
});