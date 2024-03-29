import { chalk } from "zx";
import minimist, { type ParsedArgs } from "minimist";
import process from "process";

import { downloadExtension } from "./lib/download-extension.js";
import { extensionExists } from "./lib/extension-fs.js";
import { prettifyExtension } from "./lib/prettify-extension.js";

const {
  _: [extensionId],
  help,
  prettify,
  keepZip,
  overwrite,
  doNotWriteKey,
  extensionPath,
  extensionZipPath,
  downloadURL,
} = minimist(
  // NOTE: Assumes script is called like:
  // yarn zx scripts/download-extension.ts aapbdbdomjkkjkaonfhkkikfgjllcleb
  // (i.e., we are dropping `node`, the `zx` binary, and the script name)
  process.argv.slice(3),
  {
    boolean: ["prettify", "overwrite", "keepZip", "help", "doNotWriteKey"],
    default: {
      prettify: false,
      overwrite: false,
      keepZip: false,
      help: false,
      doNotWriteKey: false,
    },
    alias: {
      h: "help",
      "keep-zip": "keepZip",
      "do-not-write-key-to-manifest": "doNotWriteKey",
      "extension-path": "extensionPath",
      "extension-zip-path": "extensionZipPath",
      url: "downloadURL",
    },
  }
) as ParsedArgs & {
  prettify: boolean;
  overwrite: boolean;
  help: boolean;
  keepZip: boolean;
  doNotWriteKey: boolean;

  extensionPath?: string;
  extensionZipPath?: string;
  downloadURL?: string;
};

const usage = () => {
  console.log(
    "Usage: yarn zx scripts/download-extension.ts [--overwrite] [--prettify] " +
      "[--keep-zip] [--do-not-write-key-to-manifest] " +
      "[--url <URL to .crx file (will follow redirects)>] " +
      "[--extensionPath <path to extracted extension directory>] " +
      "[--extensionZipPath <path to downloaded .crx file>] <extensionId>"
  );
  console.log();
  console.log("Notes:");
  console.log(" --extensionPath and --extensionZipPath are both optional");
  console.log(" --extensionPath defaults to extensions/{extensionId}");
  console.log(" --extensionZipPath defaults to extensions/{extensionId}.zip");
  console.log("   or, if --extensionPath was passed, to {extensionPath}.zip");
};

if (help) {
  usage();
  process.exit(0);
}

if (!extensionId) {
  usage();
  process.exit(1);
}

if (await extensionExists({ extensionId, extensionPath })) {
  if (!overwrite) {
    console.log(
      chalk.gray(extensionId),
      ": exists. Pass --overwrite to overwrite it."
    );
    process.exit(0);
  }

  console.log(chalk.yellow(extensionId), ": exists, overwriting...");
} else {
  console.log(chalk.green(extensionId), ": does not exist, downloading...");
}

await downloadExtension({
  extensionId,
  keepZip,
  writeKeyToManifest: !doNotWriteKey,
  extensionPath,
  extensionZipPath,
  downloadURL,
});

if (prettify) {
  console.log(chalk.green(extensionId), ": downloaded, prettifying...");
  await prettifyExtension({ extensionId, extensionPath });
} else {
  console.log(
    chalk.gray(extensionId),
    ": downloaded but not prettified. Pass --prettify to prettify it."
  );
}
