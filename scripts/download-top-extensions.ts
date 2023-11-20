import { chalk } from "zx";
import { getTopExtensions } from "./lib/top-extensions.js";
import { downloadExtension } from "./lib/download-extension.js";
import { prettifyExtension } from "./lib/prettify-extension.js";
import { extensionExists } from "./lib/extension-fs.js";

// import { EXT_IDS } from "./lib/debugging-extensions.js";

const downloadTopExtensions = async (opts?: {
  /**
   * Whether to overwrite an extension if it already exists.
   *
   * Default: `true` (skip downloading extensions that already exist)
   * */
  overwrite?: boolean;
  /**
   * Whether to prettify the files in each extension after downloading it.
   *
   * Default: `true`
   */
  prettify?: boolean;
}) => {
  const { overwrite = false, prettify = true } = opts ?? {};

  const topExtensions = await getTopExtensions();

  for (const [ranking, extension] of topExtensions.entries()) {
    const alreadyExists = await extensionExists({ extensionId: extension.id });

    const formattedPrefix = [ranking, extension.id, extension.name.padEnd(50)];

    if (alreadyExists && !overwrite) {
      console.log(chalk.gray(...formattedPrefix, "SKIP - already exists"));
      continue;
    } else {
      console.log(
        chalk.bold(
          chalk.yellow(
            ...formattedPrefix,
            "Downloading...",
            alreadyExists && overwrite ? "(overwrite)" : ""
          )
        )
      );
      console.log(chalk.gray(extension.url));
    }

    try {
      await downloadExtension({ extensionId: extension.id });
      if (prettify) {
        await prettifyExtension({ extensionId: extension.id });
      }
    } catch (err) {
      console.log(chalk.red(...formattedPrefix, "Error:", err));
    }
  }
};

await downloadTopExtensions({ overwrite: false, prettify: true });
