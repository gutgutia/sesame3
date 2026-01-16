import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, '../public/og-image.html');
const outputPath = resolve(__dirname, '../public/og-image.png');
const tempPath = resolve(__dirname, '../public/og-image-2x.png');

// Render at 2x resolution for sharper output
const browser = await chromium.launch();
const page = await browser.newPage({
  deviceScaleFactor: 2,
});
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(`file://${htmlPath}`);
await page.waitForTimeout(1500); // Wait for fonts to load
await page.screenshot({ path: tempPath, type: 'png' });
await browser.close();

// Resize to final dimensions with high quality
execFileSync('magick', [tempPath, '-resize', '1200x630', '-quality', '100', outputPath]);
unlinkSync(tempPath);

console.log('OG image converted to PNG (2x quality):', outputPath);
