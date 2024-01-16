// import { chalk } from "zx";
import minimist, { type ParsedArgs } from "minimist";
import { scrapeOverview, scrapeVersions } from "./lib/crx4chrome-scraper.js";
// import { extensionExists, getExtensionPath } from "./lib/extension-fs.js";

const {
  _: [extensionId],
  help,
  // history,
} = minimist(
  // NOTE: Assumes script is called like:
  // yarn zx scripts/scrape-extension-history.ts aapbdbdomjkkjkaonfhkkikfgjllcleb
  // (i.e., we are dropping `node`, the `zx` binary, and the script name)
  process.argv.slice(3),
  {
    boolean: ["history", "help"],
    default: {
      history: false,
      help: false,
    },
    alias: {
      h: "help",
    },
  }
) as ParsedArgs & {
  /** Set to true to scrape version history (multi-page scrape). Default false. */
  history: boolean;
  help: boolean;
};

const usage = () => {
  console.log(
    "Usage: yarn zx scripts/download-extension.ts [--overwrite] [--prettify] <extensionId>"
  );
};

if (help) {
  usage();
  process.exit(0);
}

if (!extensionId) {
  usage();
  process.exit(1);
}

const overview = await scrapeOverview({ extensionId });

console.log(JSON.stringify(overview, null, 2));

const versions = await scrapeVersions({ extension: overview });

console.log(JSON.stringify(versions, null, 2));

console.log("versions scraped:", versions.length);
