import path from "path";
import { chromium } from "playwright";

export const getConfig = (opts?: { sessionId?: string }) => {
  const { sessionId = "debugging" } = opts ?? {};

  return {
    userDataDir: path.join(".data", "sessions", sessionId),
    // inspectorURL: "chrome://inspect/#devices",
    inspectorURL: "chrome://version",
  };
};

type BrowserConfig = ReturnType<typeof getConfig>;

type LaunchBrowserOpts = {
  browserConfig: BrowserConfig;
};

const launchBrowser = async ({ browserConfig }: LaunchBrowserOpts) => {
  const pathToExtension =
    "/Users/mjr/exp/crxmon/extensions/kbfnbcaeplbcioakkpcpgfkobkghlhen";

  const browser = await chromium.launchPersistentContext(
    browserConfig.userDataDir,
    {
      ignoreHTTPSErrors: true,
      // devtools: true,
      headless: false,
      args: [
        // `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],

      // Tell playwright which default args it should _not_ pass to chrome
      // So make sure to "invert" the description for each arg to understand it.
      ignoreDefaultArgs: [
        "--disable-extensions",

        // "--disable-features",
        // "--use-mock-keychain",

        // Disables the sandbox for all process types that are normally
        // sandboxed. Meant to be used as a browser-level switch for testing
        // purposes only.
        "--no-sandbox",

        // Specifies which encryption storage backend to use. Possible values
        // are kwallet, kwallet5, gnome-libsecret, basic. Any other value will
        // lead to Chrome detecting the best backend automatically.
        "--password-store",

        // Enable indication that browser is controlled by automation.
        "--enable-automation",

        // Prevent renderer process backgrounding when set.
        "--disable-renderer-backgrounding",

        // Allows processing of input before a frame has been committed.
        "--allow-pre-commit-input", // not needed in headful

        // The /dev/shm partition is too small in certain VM environments
        "--disable-dev-shm-usage",

        // Disables the BackForwardCache feature.
        "--disable-back-forward-cache",

        // Disable backgrounding renders for occluded windows.
        // Done for tests to avoid nondeterministic behavior.
        "--disable-backgrounding-occluded-windows",

        // Disable task throttling of timer tasks from background pages.
        "--disable-background-timer-throttling",

        // Disable several subsystems which run network requests in the
        // background. This is for use when doing network performance testing to
        // avoid noise in the measurements.
        "--disable-background-networking",
      ],
    }
  );

  const page = await browser.newPage();

  await page.goto(browserConfig.inspectorURL);

  await page.goto("https://www.grextpoc.test:5173");
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
