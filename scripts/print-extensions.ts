import { chalk } from "zx";
import path from "path";
import minimist, { type ParsedArgs } from "minimist";
import { getTopExtensions } from "./lib/top-extensions.js";
import { extensionExists, getExtensionPath } from "./lib/extension-fs.js";

const { help, missing: printOnlyMissing } = minimist(process.argv.slice(3), {
  boolean: ["help", "missing"],
  alias: {
    h: "help",
  },
  default: {
    missing: false,
  },
}) as ParsedArgs & {
  help: boolean;
  missing: boolean;
};

const usage = () => {
  console.log("Usage: yarn zx scripts/print-extensions.ts [--missing]");
};

if (help) {
  usage();
  process.exit(0);
}

const printTopExtensions = async () => {
  const topExtensions = await getTopExtensions();

  for (const extension of topExtensions) {
    const alreadyExists = await extensionExists({ extensionId: extension.id });

    const extName = extension.name.padEnd(50);
    const extManifest = path.join(
      getExtensionPath({
        extensionId: extension.id,
        relativeFromProjectCwd: true,
      }),
      "manifest.json"
    );

    if (alreadyExists) {
      if (printOnlyMissing) {
        continue;
      }
      console.log(chalk.green(extName), chalk.gray(extManifest));
    } else {
      console.log(
        chalk.red(extName),
        chalk.yellow("missing, download with:"),
        chalk.gray(`yarn zx scripts/download-extension.ts ${extension.id}`)
      );
    }
  }
};

await printTopExtensions();
