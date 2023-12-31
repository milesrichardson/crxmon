import { chalk } from "zx";
import path from "path";
import minimist, { type ParsedArgs } from "minimist";
import { getTopExtensions } from "./lib/top-extensions.js";
import { extensionExists, getExtensionPath } from "./lib/extension-fs.js";

const {
  help,
  missing: printOnlyMissing,
  markdown: printAsMarkdownTable,
} = minimist(process.argv.slice(3), {
  boolean: ["help", "missing", "markdown"],
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
  console.log(
    "Usage: yarn zx scripts/print-extensions.ts [--missing] [--markdown]"
  );
};

if (help) {
  usage();
  process.exit(0);
}

const printTopExtensions = async () => {
  const topExtensions = await getTopExtensions();

  if (printAsMarkdownTable) {
    console.log("| Name | Latest Manifest File |");
    console.log("| ---- | -------------------- |");
  }

  for (const extension of topExtensions) {
    const alreadyExists = await extensionExists({ extensionId: extension.id });

    const paddedName = extension.name.padEnd(50);

    const extName = printAsMarkdownTable
      ? paddedName.replaceAll("|", "\\|")
      : paddedName;
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

      if (printAsMarkdownTable) {
        const extLink = `[${extension.id}](./extensions/${extension.id}/manifest.json)`;
        console.log(`| ${extName} | ${extLink} |`);
      } else {
        console.log(chalk.green(extName), chalk.gray(extManifest));
      }
    } else {
      if (printAsMarkdownTable) {
        console.log(`| ${extName} | Download Failed |`);
      } else {
        console.log(
          chalk.red(extName),
          chalk.yellow("missing, download with:"),
          chalk.gray(`yarn zx scripts/download-extension.ts ${extension.id}`)
        );
      }
    }
  }
};

await printTopExtensions();
