// import { chalk } from "zx";
import minimist, { type ParsedArgs } from "minimist";
import {
  // scrapeOverview,
  // scrapeVersions,
  scrapeVersionDetailPage,
} from "./lib/crx4chrome-scraper.js";
import { fs, path } from "zx";
import { GET_YARN_VAR } from "./lib/YarnVars.js";

// import { extensionExists, getExtensionPath } from "./lib/extension-fs.js";

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

// const overview = await scrapeOverview({ extensionId });

// console.log(JSON.stringify(overview, null, 2));

// const versions = await scrapeVersions({ extension: overview });

// console.log(JSON.stringify(versions, null, 2));

// console.log("versions scraped:", versions.length);

const randomCrxFile = path.join(
  GET_YARN_VAR("PROJECT_CWD"),
  "zips",
  "sitemaps",
  "random-crx.txt"
);

const SAMPLE_N = 1000;

const crxNumbers = (await fs.readFile(randomCrxFile))
  .toString()
  .split("\n")
  .map((url) => url.slice("https://www.crx4chrome.com/crx/".length, -1))
  .slice(0, SAMPLE_N);

// fs.readFile("extensions-2021.json").then((data) => {

const allMetadataKeys = new Set<string>();

const metadataValueExamples: Record<string, string[]> = {};

for (const crxNumber of crxNumbers) {
  // console.log(crxNumber);

  const { metadata: _m, rawMetadata } = await scrapeVersionDetailPage(
    `/crx/${crxNumber}/`
  );

  const rawMetadataKeys = Object.keys(rawMetadata.metadata);
  for (const key of rawMetadataKeys) {
    allMetadataKeys.add(key);
    const value: string =
      rawMetadata.metadata[key as keyof typeof rawMetadata.metadata]!;

    if (!(key in metadataValueExamples)) {
      metadataValueExamples[key] = [];
      // console.log("metadata key:", key, "value:", value);
    }

    if (
      metadataValueExamples[key].length < SAMPLE_N &&
      !metadataValueExamples[key].includes(value)
    ) {
      metadataValueExamples[key].push(value);
    }
  }

  // console.log("---- ", crxNumber, " ----");
  // console.log(JSON.stringify({ metadata, rawMetadata }, null, 2));
}

// console.log("allMetadataKeys", allMetadataKeys);

console.log(JSON.stringify([metadataValueExamples, allMetadataKeys], null, 2));

// const { metadata, rawMetadata } = await scrapeVersionDetailPage(`/crx/100130/`);

// console.log(JSON.stringify({ metadata, rawMetadata }, null, 2));
