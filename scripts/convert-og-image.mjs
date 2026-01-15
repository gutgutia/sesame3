import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, '../public/og-image.html');
const outputPath = resolve(__dirname, '../public/og-image.png');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(`file://${htmlPath}`);
await page.waitForTimeout(1000); // Wait for fonts to load
await page.screenshot({ path: outputPath, type: 'png' });
await browser.close();

console.log('OG image converted to PNG:', outputPath);
