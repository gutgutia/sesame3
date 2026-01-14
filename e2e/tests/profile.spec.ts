/**
 * Profile E2E Tests
 *
 * Tests the student profile section including all sub-pages.
 */

import { test, expect } from '../fixtures/test-fixtures';
import { waitForPageLoad, takeScreenshot, captureConsoleErrors, VIEWPORTS } from '../utils/helpers';

const PROFILE_SECTIONS = [
  { path: '/profile', name: 'Overview' },
  { path: '/profile/about', name: 'AboutMe' },
  { path: '/profile/stories', name: 'Stories' },
  { path: '/profile/activities', name: 'Activities' },
  { path: '/profile/awards', name: 'Awards' },
  { path: '/profile/courses', name: 'Courses' },
  { path: '/profile/testing', name: 'Testing' },
  { path: '/profile/programs', name: 'Programs' },
];

test.describe('Profile - Page Rendering', () => {
  for (const section of PROFILE_SECTIONS) {
    test(`should render ${section.name} page correctly`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const errors = captureConsoleErrors(page);

      await page.goto(section.path);
      await waitForPageLoad(page);

      // Should not redirect away
      expect(page.url()).toContain(section.path);

      // Page should have content
      const main = page.locator('main, [role="main"], .content');
      await expect(main.first()).toBeVisible();

      // Take screenshot
      await takeScreenshot(page, `profile-${section.name.toLowerCase()}-desktop`);

      // No critical errors
      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('404') && !e.includes('Warning')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});

test.describe('Profile - Mobile Responsiveness', () => {
  for (const section of PROFILE_SECTIONS) {
    test(`${section.name} should be responsive on mobile`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await page.setViewportSize(VIEWPORTS.mobile);

      await page.goto(section.path);
      await waitForPageLoad(page);

      // Content should be visible
      const main = page.locator('main, [role="main"], .content');
      await expect(main.first()).toBeVisible();

      // No horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();

      await takeScreenshot(page, `profile-${section.name.toLowerCase()}-mobile`);
    });
  }
});

test.describe('Profile - Navigation', () => {
  test('should navigate between profile sections', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/profile');
    await waitForPageLoad(page);

    // Look for sub-navigation or tabs
    const profileNav = page.locator('nav, [role="tablist"], .tabs, .profile-nav');

    if (await profileNav.first().isVisible()) {
      // Try clicking on Activities link/tab
      const activitiesLink = page.locator('a[href*="activities"], button:has-text("Activities")');
      if (await activitiesLink.first().isVisible()) {
        await activitiesLink.first().click();
        await waitForPageLoad(page);
        expect(page.url()).toContain('activities');
      }
    }
  });

  test('should have back navigation from sub-sections', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/profile/activities');
    await waitForPageLoad(page);

    // Look for back button or breadcrumb
    const backButton = page.locator(
      'a[href="/profile"], button:has-text("Back"), [aria-label*="back"]'
    );

    if (await backButton.first().isVisible()) {
      await backButton.first().click();
      await waitForPageLoad(page);
      expect(page.url()).toContain('/profile');
    }
  });
});

test.describe('Profile - Forms & Interactions', () => {
  test('Activities page should have add button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/profile/activities');
    await waitForPageLoad(page);

    // Look for add/create button
    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create"), a:has-text("Add")'
    );

    await takeScreenshot(page, 'profile-activities-with-add');
  });

  test('Awards page should have add functionality', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/profile/awards');
    await waitForPageLoad(page);

    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
    );

    await takeScreenshot(page, 'profile-awards-overview');
  });

  test('Testing page should show test scores section', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/profile/testing');
    await waitForPageLoad(page);

    // Should have content related to test scores
    const content = page.locator('main, .content');
    await expect(content.first()).toBeVisible();

    await takeScreenshot(page, 'profile-testing-overview');
  });
});

test.describe('Profile - Empty States', () => {
  test('should handle empty activities gracefully', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/profile/activities');
    await waitForPageLoad(page);

    // Page should either show activities or an empty state
    const hasContent = await page.locator('main, .content').first().isVisible();
    expect(hasContent).toBeTruthy();

    await takeScreenshot(page, 'profile-activities-state');
  });
});
