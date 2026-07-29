const fs = require('fs');
const path = require('path');

const existingFile = (candidate) => {
  if (!candidate) return null;
  const resolved = path.resolve(candidate);
  return fs.existsSync(resolved) ? resolved : null;
};

const getPlatformBrowserCandidates = () => {
  if (process.platform === 'win32') {
    const roots = [
      process.env.PROGRAMFILES,
      process.env['PROGRAMFILES(X86)'],
      process.env.LOCALAPPDATA,
    ].filter(Boolean);

    return roots.flatMap((root) => [
      path.join(root, 'Google/Chrome/Application/chrome.exe'),
      path.join(root, 'Chromium/Application/chrome.exe'),
      path.join(root, 'Microsoft/Edge/Application/msedge.exe'),
    ]);
  }

  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ];
  }

  return [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
};

const resolveBrowserExecutable = (puppeteer) => {
  const configuredCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_EXECUTABLE_PATH,
  ];

  for (const candidate of [...configuredCandidates, ...getPlatformBrowserCandidates()]) {
    const executable = existingFile(candidate);
    if (executable) return executable;
  }

  try {
    return existingFile(puppeteer?.executablePath?.());
  } catch {
    return null;
  }
};

const createBrowserLaunchOptions = (puppeteer) => {
  const executablePath = resolveBrowserExecutable(puppeteer);
  return {
    headless: true,
    ...(process.platform === 'linux' && {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }),
    ...(executablePath && { executablePath }),
  };
};

module.exports = {
  createBrowserLaunchOptions,
  getPlatformBrowserCandidates,
  resolveBrowserExecutable,
};
