// import { chalk } from "zx";
import minimist, { type ParsedArgs } from "minimist";
import {
  scrapeOverview,
  scrapeVersions,
  scrapeVersionDetailPage,
} from "./lib/crx4chrome-scraper.js";

import { compareExtensionVersionsDescending } from "./lib/extension-versions.js";

/***
 *
 * NOTE
 *
 * File is WIP (just using it to call the lib file for testing atm)
 *
 * TODO: Check the metadata sampling and update the type of VersionDetailMetadata
 */

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
    "Usage: yarn zx scripts/scrape-extension-history.ts <extensionId>"
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
// console.log(JSON.stringify(overview, null, 2));

const unsortedVersions = await scrapeVersions({ extension: overview });

// console.log(JSON.stringify(versions, null, 2));
// console.log("versions scraped:", versions.length);

// const crxNumbers = versions.map((v) => v.crxPage.slice("/crx/".length, -1));

// TODO: Handle error when scraping a version
for (const version of unsortedVersions) {
  const crxNumber = version.crxPage.slice("/crx/".length, -1);

  console.error("scraping version detail for", crxNumber, version.metadata[1]);
  const { metadata } = await scrapeVersionDetailPage(`/crx/${crxNumber}/`);

  version.detail = metadata;
}

const versions = unsortedVersions.sort((a, b) =>
  compareExtensionVersionsDescending(a.detail.version, b.detail.version)
);

console.log(JSON.stringify({ overview, versions }, null, 2));
