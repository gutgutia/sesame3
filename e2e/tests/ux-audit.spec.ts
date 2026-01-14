/**
 * UX Audit Test Suite
 *
 * Comprehensive visual and UX audit that captures screenshots of all pages
 * and runs accessibility and usability checks.
 */

import { test, expect } from '../fixtures/test-fixtures';
import {
  waitForPageLoad,
  takeScreenshot,
  captureConsoleErrors,
  checkBasicAccessibility,
  VIEWPORTS,
} from '../utils/helpers';

// All routes to audit
const ALL_ROUTES = [
  // Main app routes
  { path: '/', name: 'dashboard', description: 'Main Dashboard' },
  { path: '/profile', name: 'profile-overview', description: 'Profile Overview' },
  { path: '/profile/about', name: 'profile-about', description: 'About Me' },
  { path: '/profile/stories', name: 'profile-stories', description: 'Stories' },
  { path: '/profile/activities', name: 'profile-activities', description: 'Activities' },
  { path: '/profile/awards', name: 'profile-awards', description: 'Awards' },
  { path: '/profile/courses', name: 'profile-courses', description: 'Courses' },
  { path: '/profile/testing', name: 'profile-testing', description: 'Test Scores' },
  { path: '/profile/programs', name: 'profile-programs', description: 'Programs' },
  { path: '/schools', name: 'schools', description: 'School List' },
  { path: '/plan', name: 'plan', description: 'Goals & Plan' },
  { path: '/discover', name: 'discover', description: 'Discover' },
  { path: '/advisor', name: 'advisor', description: 'AI Advisor' },
  { path: '/settings', name: 'settings', description: 'Settings' },
  { path: '/chances', name: 'chances', description: 'Chances Calculator' },
  { path: '/opportunities', name: 'opportunities', description: 'Opportunities' },
];

// Public routes (unauthenticated)
const PUBLIC_ROUTES = [
  { path: '/auth', name: 'auth', description: 'Login/Signup' },
  { path: '/onboarding', name: 'onboarding', description: 'Onboarding' },
];

interface AuditResult {
  route: string;
  name: string;
  description: string;
  viewport: string;
  issues: string[];
  consoleErrors: string[];
  loadTime: number;
  screenshot: string;
}

const auditResults: AuditResult[] = [];

test.describe('UX Audit - Desktop Screenshots', () => {
  for (const route of ALL_ROUTES) {
    test(`Audit: ${route.description} (Desktop)`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const errors = captureConsoleErrors(page);
      const startTime = Date.now();

      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(route.path);
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;

      // Run accessibility checks
      const a11yIssues = await checkBasicAccessibility(page);

      // Check for common UX issues
      const uxIssues: string[] = [...a11yIssues];

      // Check for loading spinners stuck on screen
      const hasStuckLoader = await page.locator('.animate-spin, [data-loading="true"]').isVisible();
      if (hasStuckLoader) {
        const loaderStillVisible = await page
          .locator('.animate-spin, [data-loading="true"]')
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        if (loaderStillVisible) {
          uxIssues.push('Loading spinner still visible after page load');
        }
      }

      // Check for empty content areas
      const mainContent = page.locator('main, [role="main"]');
      const isEmpty = await mainContent.evaluate((el) => {
        return el?.textContent?.trim().length === 0;
      }).catch(() => true);
      if (isEmpty) {
        uxIssues.push('Main content area appears empty');
      }

      // Check for broken images
      const brokenImages = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        let broken = 0;
        images.forEach((img) => {
          if (!img.complete || img.naturalHeight === 0) {
            broken++;
          }
        });
        return broken;
      });
      if (brokenImages > 0) {
        uxIssues.push(`${brokenImages} broken image(s) detected`);
      }

      // Take full page screenshot
      const screenshotName = `audit-${route.name}-desktop`;
      await takeScreenshot(page, screenshotName, { fullPage: true });

      // Store results
      auditResults.push({
        route: route.path,
        name: route.name,
        description: route.description,
        viewport: 'desktop',
        issues: uxIssues,
        consoleErrors: errors.filter((e) => !e.includes('favicon')),
        loadTime,
        screenshot: `${screenshotName}.png`,
      });

      // Test assertions
      expect(loadTime).toBeLessThan(10000); // Page should load within 10s
    });
  }
});

test.describe('UX Audit - Mobile Screenshots', () => {
  for (const route of ALL_ROUTES) {
    test(`Audit: ${route.description} (Mobile)`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      const errors = captureConsoleErrors(page);
      const startTime = Date.now();

      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto(route.path);
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;

      const uxIssues: string[] = [];

      // Check for horizontal overflow (critical on mobile)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      if (hasHorizontalScroll) {
        uxIssues.push('Horizontal scroll detected - content overflows viewport');
      }

      // Check for touch target sizes (minimum 44x44px recommended)
      const smallTouchTargets = await page.evaluate(() => {
        const clickables = document.querySelectorAll('button, a, input, [role="button"]');
        let small = 0;
        clickables.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 44 || rect.height < 44) {
            // Only count if visible
            if (rect.width > 0 && rect.height > 0) {
              small++;
            }
          }
        });
        return small;
      });
      if (smallTouchTargets > 3) {
        uxIssues.push(`${smallTouchTargets} elements with small touch targets (<44px)`);
      }

      // Check for text too small to read
      const smallText = await page.evaluate(() => {
        const allText = document.querySelectorAll('p, span, div, li, td, th, label');
        let tooSmall = 0;
        allText.forEach((el) => {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 12 && el.textContent?.trim()) {
            tooSmall++;
          }
        });
        return tooSmall;
      });
      if (smallText > 5) {
        uxIssues.push(`${smallText} text elements with font-size < 12px`);
      }

      const screenshotName = `audit-${route.name}-mobile`;
      await takeScreenshot(page, screenshotName, { fullPage: true });

      auditResults.push({
        route: route.path,
        name: route.name,
        description: route.description,
        viewport: 'mobile',
        issues: uxIssues,
        consoleErrors: errors.filter((e) => !e.includes('favicon')),
        loadTime,
        screenshot: `${screenshotName}.png`,
      });
    });
  }
});

test.describe('UX Audit - Tablet Screenshots', () => {
  for (const route of ALL_ROUTES) {
    test(`Audit: ${route.description} (Tablet)`, async ({ authenticatedPage }) => {
      const page = authenticatedPage;
      await page.setViewportSize(VIEWPORTS.tablet);

      await page.goto(route.path);
      await waitForPageLoad(page);

      const screenshotName = `audit-${route.name}-tablet`;
      await takeScreenshot(page, screenshotName, { fullPage: true });
    });
  }
});

test.describe('UX Audit - Public Pages', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`Audit: ${route.description}`, async ({ unauthenticatedPage }) => {
      const page = unauthenticatedPage;
      const errors = captureConsoleErrors(page);

      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(route.path);
      await waitForPageLoad(page);

      const a11yIssues = await checkBasicAccessibility(page);

      await takeScreenshot(page, `audit-${route.name}-desktop`, { fullPage: true });

      // Mobile
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.reload();
      await waitForPageLoad(page);
      await takeScreenshot(page, `audit-${route.name}-mobile`, { fullPage: true });

      // Check form usability for auth page
      if (route.path === '/auth') {
        const emailInput = page.locator('input[type="email"]');
        const isVisible = await emailInput.isVisible();
        expect(isVisible).toBeTruthy();
      }
    });
  }
});

test.describe('UX Audit - Interaction States', () => {
  test('Button hover states', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/');
    await waitForPageLoad(page);

    // Find a button and hover
    const button = page.locator('button').first();
    if (await button.isVisible()) {
      await button.hover();
      await takeScreenshot(page, 'audit-button-hover-state');
    }
  });

  test('Form focus states', async ({ unauthenticatedPage }) => {
    const page = unauthenticatedPage;
    await page.goto('/auth');
    await waitForPageLoad(page);

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.focus();
      await takeScreenshot(page, 'audit-input-focus-state');
    }
  });

  test('Loading states simulation', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/');

    // Capture during load
    await page.screenshot({
      path: 'e2e/screenshots/audit-loading-state.png',
    });
  });
});

test.describe('UX Audit - Error States', () => {
  test('Network error handling', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Go offline
    await page.context().setOffline(true);

    await page.goto('/').catch(() => {});

    await takeScreenshot(page, 'audit-offline-state');

    // Go back online
    await page.context().setOffline(false);
  });
});
