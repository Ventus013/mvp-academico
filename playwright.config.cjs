const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './browser-test',
  workers: 1,
  timeout: 30000,
  use: { baseURL: process.env.ACADEMIC_URL || 'http://127.0.0.1:3100', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: process.env.ACADEMIC_URL ? undefined : { command: 'npm start', url: 'http://127.0.0.1:3100/api/products', reuseExistingServer: false },
});
