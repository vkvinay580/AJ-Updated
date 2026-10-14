const { test } = require('playwright/test');

test('debug root page', async ({ page }) => {
  page.on('console', (message) => {
    console.log(`console:${message.type()}:${message.text()}`);
  });

  page.on('pageerror', (error) => {
    console.log(`pageerror:${error.stack}`);
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    console.log(`requestfailed:${request.url()}:${failure ? failure.errorText : 'unknown'}`);
  });

  const response = await page.goto('http://localhost/Android%20Project%203/', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log(`status:${response ? response.status() : 'no-response'}`);
  console.log(`title:${await page.title()}`);
  console.log(`bodyText:${(await page.locator('body').innerText()).slice(0, 500)}`);

  await page.screenshot({
    path: 'playwright_root.png',
    fullPage: true,
  });
});
