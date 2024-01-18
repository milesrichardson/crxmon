import path from "path";
import { chromium } from "playwright";

export const getConfig = (opts?: { sessionId?: string }) => {
  const { sessionId = "debugging" } = opts ?? {};

  return {
    userDataDir: path.join(".data", "sessions", sessionId),
    inspectorURL: "chrome://inspect/#devices",
  };
};

type BrowserConfig = ReturnType<typeof getConfig>;

type LaunchBrowserOpts = {
  browserConfig: BrowserConfig;
};

const launchBrowser = async ({ browserConfig }: LaunchBrowserOpts) => {
  const browser = await chromium.launchPersistentContext(
    browserConfig.userDataDir,
    {
      ignoreHTTPSErrors: true,
      devtools: true,
    }
  );

  const page = await browser.newPage();

  await page.goto(browserConfig.inspectorURL);
};

export const launch = async () => {
  const browserConfig = getConfig();

  await launchBrowser({ browserConfig });
};

launch()
  .then(() => {
    console.log("Done");
  })
  .catch((err) => {
    console.error("Done with error");
    console.error(err);
  });
