/**
 * Quick UAT Test - Works around cloud environment network restrictions
 *
 * Uses Playwright's page context for API calls instead of Node fetch.
 * Captures screenshots and evaluates UX from student perspectives.
 */

import { test, expect, Page } from '@playwright/test';

// =============================================================================
// TEST USERS (from seed-users.ts)
// =============================================================================

const STUDENTS = [
  {
    email: 'abhishek.gutgutia+highachiever@gmail.com',
    name: 'Emma Chen',
    type: 'highachiever',
    description: '4.0 GPA, 1560 SAT, Science Olympiad President, aiming for HYPSM',
  },
  {
    email: 'abhishek.gutgutia+average@gmail.com',
    name: 'Jake Martinez',
    type: 'average',
    description: '3.5 GPA, 1280 SAT, Varsity Soccer, works at Chick-fil-A',
  },
  {
    email: 'abhishek.gutgutia+stem@gmail.com',
    name: 'Priya Sharma',
    type: 'stem',
    description: 'USAMO Qualifier, 1520 SAT, wants PhD at MIT',
  },
  {
    email: 'abhishek.gutgutia+athlete@gmail.com',
    name: 'Marcus Johnson',
    type: 'athlete',
    description: 'ESPN 4-Star Basketball Recruit, Duke/UNC prospect',
  },
];

interface Finding {
  type: 'positive' | 'friction' | 'bug' | 'suggestion';
  area: string;
  issue: string;
  impact: string;
}

const allFindings: Finding[] = [];

// =============================================================================
// HELPER: Screenshot with findings
// =============================================================================

async function captureAndAnalyze(
  page: Page,
  name: string,
  studentType: string
): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Take screenshot
  await page.screenshot({
    path: `e2e/screenshots/uat-${name}-${studentType}.png`,
    fullPage: true,
  });

  // Analyze the page
  const content = await page.textContent('body').catch(() => '');

  return findings;
}

// =============================================================================
// HELPER: Login via page context
// =============================================================================

async function loginViaPage(page: Page, email: string): Promise<boolean> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  try {
    // Use page's request context (uses browser network stack)
    const response = await page.request.post(`${baseURL}/api/test/create-user`, {
      data: { email },
    });

    if (!response.ok()) {
      console.log(`Failed to create user: ${response.status()}`);
      return false;
    }

    const user = await response.json();

    // Create session token
    const sessionPayload = {
      userId: user.id,
      email: user.email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    const sessionToken = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    // Set cookies via page context
    const url = new URL(baseURL);
    await page.context().addCookies([
      {
        name: 'sesame_session',
        value: sessionToken,
        domain: url.hostname,
        path: '/',
        httpOnly: true,
        secure: url.protocol === 'https:',
        sameSite: 'Lax',
      },
      {
        name: 'sesame_user_id',
        value: user.id,
        domain: url.hostname,
        path: '/',
        httpOnly: true,
        secure: url.protocol === 'https:',
        sameSite: 'Lax',
      },
    ]);

    return true;
  } catch (error) {
    console.log(`Login error: ${error}`);
    return false;
  }
}

// =============================================================================
// TEST: Auth Page (No login required)
// =============================================================================

test.describe('UAT: Auth Page Experience', () => {
  test('Evaluate login page UX', async ({ page }) => {
    const findings: Finding[] = [];

    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'e2e/screenshots/uat-auth-page-desktop.png',
      fullPage: true,
    });

    // Check for key elements
    const hasEmailInput = await page.locator('input[type="email"]').isVisible();
    const hasGoogleButton = await page.locator('text=/google/i').isVisible();
    const hasContinueButton = await page.locator('button:has-text("Continue")').isVisible();
    const hasHeadline = await page.locator('h1, h2').first().isVisible();

    if (hasEmailInput) {
      findings.push({
        type: 'positive',
        area: 'Auth',
        issue: 'Email input clearly visible',
        impact: 'Students can easily start signing up',
      });
    }

    if (hasGoogleButton) {
      findings.push({
        type: 'positive',
        area: 'Auth',
        issue: 'Google sign-in option available',
        impact: 'Quick signup for students with Google accounts',
      });
    }

    if (hasContinueButton) {
      findings.push({
        type: 'positive',
        area: 'Auth',
        issue: 'Clear CTA button',
        impact: 'Students know how to proceed',
      });
    }

    // Check for branding
    const content = await page.textContent('body');
    if (content?.includes('college') || content?.includes('College')) {
      findings.push({
        type: 'positive',
        area: 'Auth',
        issue: 'College-related messaging visible',
        impact: 'Students understand the app purpose',
      });
    }

    // Mobile check
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: 'e2e/screenshots/uat-auth-page-mobile.png',
      fullPage: true,
    });

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    if (hasHorizontalScroll) {
      findings.push({
        type: 'bug',
        area: 'Auth Mobile',
        issue: 'Horizontal scroll on mobile',
        impact: 'Frustrating experience on phones',
      });
    } else {
      findings.push({
        type: 'positive',
        area: 'Auth Mobile',
        issue: 'No horizontal scroll',
        impact: 'Works well on phones',
      });
    }

    allFindings.push(...findings);

    // Print findings
    console.log('\n📱 AUTH PAGE FINDINGS:');
    for (const f of findings) {
      const icon = { positive: '✅', friction: '⚠️', bug: '🐛', suggestion: '💡' }[f.type];
      console.log(`   ${icon} [${f.area}] ${f.issue}`);
    }
  });
});

// =============================================================================
// TEST: Student Journeys (With login)
// =============================================================================

for (const student of STUDENTS) {
  test.describe(`UAT: ${student.name} (${student.type})`, () => {

    test('Complete student journey', async ({ page }) => {
      const findings: Finding[] = [];

      console.log(`\n🎓 Testing as ${student.name} (${student.type})`);
      console.log(`   ${student.description}`);

      // Try to login
      const loggedIn = await loginViaPage(page, student.email);

      if (!loggedIn) {
        console.log('   ⚠️ Could not authenticate - testing public view');

        // Still capture what unauthenticated users see
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Should redirect to auth
        const url = page.url();
        if (url.includes('/auth') || url.includes('/login')) {
          findings.push({
            type: 'positive',
            area: 'Security',
            issue: 'Protected routes redirect to login',
            impact: 'Unauthorized users cannot access student data',
          });
        }

        await page.screenshot({
          path: `e2e/screenshots/uat-redirect-${student.type}.png`,
          fullPage: true,
        });

        allFindings.push(...findings);
        return;
      }

      // === DASHBOARD ===
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `e2e/screenshots/uat-dashboard-${student.type}.png`,
        fullPage: true,
      });

      const dashboardContent = await page.textContent('body');

      // Check for personalization
      const firstName = student.name.split(' ')[0];
      if (dashboardContent?.includes(firstName)) {
        findings.push({
          type: 'positive',
          area: 'Dashboard',
          issue: `Shows student name "${firstName}"`,
          impact: `${student.name} feels personally welcomed`,
        });
      } else {
        findings.push({
          type: 'friction',
          area: 'Dashboard',
          issue: 'Student name not visible on dashboard',
          impact: 'Feels impersonal, like a generic template',
        });
      }

      // Check for CTAs
      const ctaCount = await page.locator('button, a').filter({ hasText: /start|add|explore|continue/i }).count();
      if (ctaCount > 0) {
        findings.push({
          type: 'positive',
          area: 'Dashboard',
          issue: `${ctaCount} clear call-to-action buttons`,
          impact: 'Student knows what to do next',
        });
      }

      // === PROFILE ===
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `e2e/screenshots/uat-profile-${student.type}.png`,
        fullPage: true,
      });

      const profileContent = await page.textContent('body');

      // Check for GPA display
      if (/\d\.\d{1,2}/.test(profileContent || '')) {
        findings.push({
          type: 'positive',
          area: 'Profile',
          issue: 'GPA displayed',
          impact: `${student.name} can verify their academic info`,
        });
      }

      // === ACTIVITIES ===
      await page.goto('/profile/activities');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `e2e/screenshots/uat-activities-${student.type}.png`,
        fullPage: true,
      });

      // === SCHOOLS ===
      await page.goto('/schools');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `e2e/screenshots/uat-schools-${student.type}.png`,
        fullPage: true,
      });

      const schoolsContent = await page.textContent('body');
      if (/reach|target|safety|dream/i.test(schoolsContent || '')) {
        findings.push({
          type: 'positive',
          area: 'Schools',
          issue: 'School categories visible (reach/target/safety)',
          impact: 'Helps understand realistic options',
        });
      }

      // === ADVISOR ===
      await page.goto('/advisor');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `e2e/screenshots/uat-advisor-${student.type}.png`,
        fullPage: true,
      });

      const hasChatInput = await page.locator('textarea, input[type="text"]').first().isVisible().catch(() => false);
      if (hasChatInput) {
        findings.push({
          type: 'positive',
          area: 'Advisor',
          issue: 'Chat input visible',
          impact: `${student.name} can ask questions easily`,
        });
      }

      // === MOBILE CHECK ===
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `e2e/screenshots/uat-mobile-dashboard-${student.type}.png`,
        fullPage: true,
      });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (!hasHorizontalScroll) {
        findings.push({
          type: 'positive',
          area: 'Mobile',
          issue: 'No horizontal overflow',
          impact: 'Works well on phones',
        });
      } else {
        findings.push({
          type: 'bug',
          area: 'Mobile',
          issue: 'Horizontal scroll detected',
          impact: 'Frustrating to use on phone',
        });
      }

      allFindings.push(...findings);

      // Print findings for this student
      console.log(`\n   FINDINGS for ${student.name}:`);
      for (const f of findings) {
        const icon = { positive: '✅', friction: '⚠️', bug: '🐛', suggestion: '💡' }[f.type];
        console.log(`      ${icon} [${f.area}] ${f.issue}`);
      }
    });
  });
}

// =============================================================================
// FINAL REPORT
// =============================================================================

test.afterAll(async () => {
  console.log('\n');
  console.log('='.repeat(80));
  console.log('   SESAME3 USER ACCEPTANCE TEST - FINAL REPORT');
  console.log('='.repeat(80));

  const positive = allFindings.filter(f => f.type === 'positive');
  const friction = allFindings.filter(f => f.type === 'friction');
  const bugs = allFindings.filter(f => f.type === 'bug');
  const suggestions = allFindings.filter(f => f.type === 'suggestion');

  console.log(`\n📊 SUMMARY:`);
  console.log(`   ✅ Positive: ${positive.length}`);
  console.log(`   ⚠️  Friction Points: ${friction.length}`);
  console.log(`   🐛 Bugs: ${bugs.length}`);
  console.log(`   💡 Suggestions: ${suggestions.length}`);

  if (friction.length > 0) {
    console.log(`\n⚠️  FRICTION POINTS:`);
    for (const f of friction) {
      console.log(`   • [${f.area}] ${f.issue}`);
      console.log(`     Impact: ${f.impact}`);
    }
  }

  if (bugs.length > 0) {
    console.log(`\n🐛 BUGS:`);
    for (const f of bugs) {
      console.log(`   • [${f.area}] ${f.issue}`);
      console.log(`     Impact: ${f.impact}`);
    }
  }

  console.log(`\n✅ WHAT'S WORKING WELL:`);
  for (const f of positive) {
    console.log(`   • [${f.area}] ${f.issue}`);
  }

  console.log('\n');
  console.log('='.repeat(80));
  console.log('   Screenshots saved to: e2e/screenshots/');
  console.log('='.repeat(80));
  console.log('\n');
});
