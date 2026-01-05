/**
 * Extended test helper utilities for E2E tests
 * Builds upon the common.ts helpers
 */
import { Page, expect } from '@playwright/test';

/**
 * Waits for autosave to complete
 * Looks for visual indicators or network idle state
 */
export async function waitForAutosave(page: Page, timeoutMs: number = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: timeoutMs });
  // Additional wait to ensure autosave completed
  await page.waitForTimeout(1000);
}

/**
 * Fills a multi-select dropdown with multiple values
 * @param page - Playwright page
 * @param label - Label text or selector for the multi-select
 * @param values - Array of values to select
 */
export async function fillMultiSelect(
  page: Page,
  label: string,
  values: string[]
): Promise<void> {
  await page.getByText(label).click();
  
  for (const value of values) {
    await page.keyboard.type(value);
    await page.waitForTimeout(500); // Wait for options to load
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  }
  
  // Click outside to close dropdown
  await page.keyboard.press('Escape');
}

/**
 * Selects an option from a standard select dropdown
 */
export async function selectFromDropdown(
  page: Page,
  label: string,
  value: string
): Promise<void> {
  const dropdown = page.getByLabel(label);
  await dropdown.selectOption(value);
}

/**
 * Fills a date input field
 * @param page - Playwright page
 * @param label - Label for the date input
 * @param date - Date string in MM/DD/YYYY format
 */
export async function fillDateInput(
  page: Page,
  label: string,
  date: string
): Promise<void> {
  await page.getByLabel(label).fill(date);
}

/**
 * Fills a rich text editor (Draft.js based)
 * @param page - Playwright page
 * @param label - Label or identifier for the editor
 * @param text - Text to type
 */
export async function fillRichTextEditor(
  page: Page,
  label: string,
  text: string
): Promise<void> {
  const editor = page.getByRole('textbox', { name: label });
  await editor.locator('div').nth(2).click();
  await page.keyboard.type(text);
}

/**
 * Uploads a file using the file input
 * @param page - Playwright page
 * @param selector - Selector for file input
 * @param filePath - Path to file to upload
 */
export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string
): Promise<void> {
  const fileInput = page.locator(selector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Navigates to a specific section using the side navigation
 * @param page - Playwright page
 * @param linkName - Text of the nav link
 */
export async function navigateToSection(page: Page, linkName: string): Promise<void> {
  await page.getByRole('link', { name: linkName }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Clicks a button and waits for navigation
 */
export async function clickAndWaitForNavigation(
  page: Page,
  buttonName: string
): Promise<void> {
  await page.getByRole('button', { name: buttonName }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Extracts report ID from the current URL
 * Works for activity reports, training reports, etc.
 */
export function extractReportIdFromUrl(url: string): string | undefined {
  return url.split('/').find((part) => /^\d+$/.test(part));
}

/**
 * Extracts report number from text (e.g., "R01-AR-1234" returns "1234")
 */
export function extractReportNumber(text: string): string | null {
  const match = text.match(/\d+$/);
  return match ? match[0] : null;
}

/**
 * Waits for a specific element to be visible with custom timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeoutMs: number = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout: timeoutMs });
}

/**
 * Asserts that no console errors occurred during test
 * Should be set up in beforeEach hook
 */
export function setupConsoleErrorTracking(page: Page): string[] {
  const consoleErrors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  return consoleErrors;
}

/**
 * Gets the user's full name from the welcome message
 */
export async function getUserFullName(page: Page): Promise<string> {
  await page.goto('/');
  const welcomeText = page.getByRole('heading', { name: /welcome to the tta hub,/i });
  const text = await welcomeText.textContent();
  return text ? text.replace(/welcome to the tta hub, /i, '') : '';
}

/**
 * Gets the region number from an activity report heading
 */
export async function getRegionNumber(page: Page): Promise<string> {
  const heading = page.getByRole('heading', { name: /activity report for region \d/i });
  const text = await heading.textContent();
  const match = text?.match(/\d/);
  return match ? match[0] : '1';
}

/**
 * Waits for a modal to appear
 */
export async function waitForModal(page: Page, modalHeading: string): Promise<void> {
  await page.waitForSelector(`h2:has-text("${modalHeading}")`, { state: 'visible' });
}

/**
 * Closes a modal by clicking the close button or escape
 */
export async function closeModal(page: Page, useEscape: boolean = true): Promise<void> {
  if (useEscape) {
    await page.keyboard.press('Escape');
  } else {
    await page.getByRole('button', { name: /close/i }).click();
  }
}

/**
 * Applies filters on a page with filter sidebar
 */
export async function openFiltersPanel(page: Page): Promise<void> {
  await page.getByRole('button', { name: /open filters for this page/i }).click();
}

/**
 * Removes a filter pill by its text
 */
export async function removeFilter(page: Page, filterText: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`removes the filter.*${filterText}`, 'i') }).click();
}

/**
 * Verifies that an element is visible
 */
export async function assertVisible(page: Page, selector: string, message?: string): Promise<void> {
  await expect(page.locator(selector), message).toBeVisible();
}

/**
 * Verifies that an element is not visible
 */
export async function assertNotVisible(page: Page, selector: string, message?: string): Promise<void> {
  await expect(page.locator(selector), message).not.toBeVisible();
}

/**
 * Opens an action menu (three-dot menu) for a specific item
 */
export async function openActionMenu(page: Page, itemIdentifier: string): Promise<void> {
  await page.getByRole('button', { name: `Actions for ${itemIdentifier}` }).click();
}

/**
 * Selects an action from an open action menu
 */
export async function selectActionMenuItem(page: Page, actionName: string): Promise<void> {
  await page.getByRole('button', { name: actionName }).click();
}
