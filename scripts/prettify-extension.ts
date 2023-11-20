import { chalk } from "zx";
import { prettifyExtension } from "./lib/prettify-extension.js";
import minimist, { type ParsedArgs } from "minimist";
import { extensionExists, getExtensionPath } from "./lib/extension-fs.js";

const {
  _: [extensionId],
  help,
} = minimist(process.argv.slice(3), {
  boolean: ["help"],
  alias: {
    h: "help",
  },
}) as ParsedArgs & {
  help: boolean;
};

const usage = () => {
  console.log("Usage: yarn zx scripts/prettify-extension.ts <extensionId>");
};

if (help) {
  usage();
  process.exit(0);
}

if (!extensionId) {
  usage();
  process.exit(1);
}

if (!(await extensionExists({ extensionId }))) {
  console.error(
    chalk.red(extensionId),
    ": does not exist at",
    chalk.gray(getExtensionPath({ extensionId }))
  );
  process.exit(1);
}

await prettifyExtension({ extensionId });

console.log(
  chalk.green(extensionId),
  ": prettified at",
  chalk.gray(getExtensionPath({ extensionId }))
);

console.log(chalk.gray("Note: any errors were ignored"));
