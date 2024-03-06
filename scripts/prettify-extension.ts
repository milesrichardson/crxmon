import { chalk } from "zx";
import { prettifyExtension } from "./lib/prettify-extension.js";
import minimist, { type ParsedArgs } from "minimist";
import { extensionExists, getExtensionPath } from "./lib/extension-fs.js";

// TODO: Technically, there should be no reason why the user needs to provide
// the extensionId if they are providing the extensionPath.

const {
  _: [extensionId],
  help,
  extensionPath,
} = minimist(process.argv.slice(3), {
  boolean: ["help"],
  alias: {
    h: "help",
    "extension-path": "extensionPath",
  },
}) as ParsedArgs & {
  help: boolean;
  extensionPath?: string;
};

const usage = () => {
  console.log(
    "Usage: yarn zx scripts/prettify-extension.ts " +
      "[--extensionPath <path to extracted extension directory>] " +
      "<extensionId>"
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

if (!(await extensionExists({ extensionId, extensionPath }))) {
  console.error(
    chalk.red(extensionId),
    ": does not exist at",
    chalk.gray(extensionPath ?? getExtensionPath({ extensionId }))
  );
  process.exit(1);
}

await prettifyExtension({ extensionId, extensionPath });

console.log(
  chalk.green(extensionId),
  ": prettified at",
  chalk.gray(extensionPath ?? getExtensionPath({ extensionId }))
);

console.log(chalk.gray("Note: any errors were ignored"));
