import { fetch } from "zx";
import { JSDOM } from "jsdom";

/**
 * Given a newline separated list of chrome args, this script will lookup
 * their documentation from https://peter.sh/experiments/chromium-command-line-switches/
 * and re-print the args, interleaved with their explanations as // comments
 */

const chromeArgs = `
--disable-field-trial-config
--disable-background-networking
--enable-features=NetworkService,NetworkServiceInProcess
--disable-background-timer-throttling
--disable-backgrounding-occluded-windows
--disable-back-forward-cache
--disable-breakpad
--disable-client-side-phishing-detection
--disable-component-extensions-with-background-pages
--disable-component-update
--no-default-browser-check
--disable-default-apps
--disable-dev-shm-usage
--disable-extensions
--disable-features=ImprovedCookieControls,LazyFrameLoading,GlobalMediaControls,DestroyProfileOnBrowserClose,MediaRouter,DialMediaRouteProvider,AcceptCHFrame,AutoExpandDetailsElement,CertificateTransparencyComponentUpdater,AvoidUnnecessaryBeforeUnloadCheckSync,Translate,HttpsUpgrades,PaintHolding
--allow-pre-commit-input
--disable-hang-monitor
--disable-ipc-flooding-protection
--disable-popup-blocking
--disable-prompt-on-repost
--disable-renderer-backgrounding
--force-color-profile=srgb
--metrics-recording-only
--no-first-run
--enable-automation
--password-store=basic
--use-mock-keychain
--no-service-autorun
--export-tagged-pdf
--disable-search-engine-choice-screen
--enable-use-zoom-for-dsf=false
--no-sandbox
--disable-extensions-except=/Users/mjr/exp/crxmon/instrumented/kbfnbcaeplbcioakkpcpgfkobkghlhen
--load-extension=/Users/mjr/exp/crxmon/instrumented/kbfnbcaeplbcioakkpcpgfkobkghlhen
--user-data-dir=.data/sessions/debugging
--remote-debugging-pipe
--flag-switches-begin
--flag-switches-end
--file-url-path-alias=/gen=/Users/mjr/Library/Caches/ms-playwright/chromium-1097/chrome-mac/gen about:blank
`;

const explainArgs = (
  unexplainedArgs: string,
  explanations: Map<string, string>
) => {
  const args = unexplainedArgs
    .split("\n")
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0);

  const argsWithExplanations = args.map((arg) => {
    const [argName, ...argValues] = arg.split("=");

    const argExplanation = explanations.has(argName)
      ? explanations.get(argName)!
      : "No explanation found";

    return {
      argName,
      argValues,
      argExplanation,
      rawArg: arg,
    };
  });

  return argsWithExplanations;
};

const downloadExplanationsDocument = async (): Promise<Document> => {
  const url = "https://peter.sh/experiments/chromium-command-line-switches/";

  const pageSource = await fetch(url).then((resp) => resp.text());

  const pageDOM = new JSDOM(pageSource, {
    url: url,
  });

  if (!pageDOM || !pageDOM.window || !pageDOM.window.document) {
    throw new Error(`Could not parse page: ${url}`);
  }

  return pageDOM.window.document;
};

const fetchExplanations = async () => {
  const explanationsDocument = await downloadExplanationsDocument();

  const explanationsTable = explanationsDocument.querySelector("tbody");

  const explanations = new Map<string, string>();

  Array.from(explanationsTable!.querySelectorAll("tr")).forEach((expRow) => {
    const flag = `--${expRow.getAttribute("id")}`;
    const explanation = Array.from(expRow.querySelectorAll("td")).at(
      -1
    )!.textContent;

    if (explanations.has(flag)) {
      console.warn(`Duplicate flag: ${flag}`);
      return;
    }

    explanations.set(flag, explanation ?? "No explanation found");
  });

  return explanations;
};

const explanations = await fetchExplanations();

const argsWithExplanations = explainArgs(chromeArgs, explanations);

for (const arg of argsWithExplanations) {
  console.log(`
// ${arg.argExplanation}
${arg.rawArg}
`);
}
