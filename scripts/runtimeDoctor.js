require('dotenv').config();

const { URL } = require('url');
const puppeteer = require('puppeteer');
const {
  resolveBrowserExecutable,
} = require('../src/config/runtimeConfig');

const databaseTarget = (() => {
  try {
    const url = new URL(process.env.DATABASE_URL);
    return `${url.hostname}:${url.port || '5432'}/${url.pathname.replace(/^\//, '')}`;
  } catch {
    return 'DATABASE_URL belum valid atau belum dimuat';
  }
})();

const browserExecutable = resolveBrowserExecutable(puppeteer);

console.table({
  platform: process.platform,
  architecture: process.arch,
  node: process.version,
  database: databaseTarget,
  browser: browserExecutable || 'Puppeteer-managed browser tidak ditemukan',
});

if (!browserExecutable) {
  console.error(
    'Browser executable tidak ditemukan. Install Chrome/Chromium atau set CHROME_EXECUTABLE_PATH.'
  );
  process.exitCode = 1;
}
