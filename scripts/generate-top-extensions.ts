import { chalk } from "zx";
import minimist, { type ParsedArgs } from "minimist";
import fs from "node:fs";

import {
  getExtensionDataPaths,
  getAllExtensions,
} from "./lib/top-extensions.js";

const defaultTopExtensions = 100;

const {
  _: [numExtensionsArg],
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
  console.log(
    "Usage: yarn zx scripts/generate-top-extensions.ts [numExtensions(default 100)]"
  );
};

if (help) {
  usage();
  process.exit(0);
}

const numExtensions =
  typeof numExtensionsArg !== "undefined"
    ? parseInt(numExtensionsArg)
    : defaultTopExtensions;

const generateAndWriteTopExtensions = async (
  numberOfExtensions: number = defaultTopExtensions
) => {
  const { topExtensionsPath: defaultTopExtensionsPath, getTopNExtensionsPath } =
    getExtensionDataPaths();
  const allExtensions = await getAllExtensions();
  const topExtensions = allExtensions.slice(0, numberOfExtensions);

  const topExtensionsPath =
    numberOfExtensions === defaultTopExtensions
      ? defaultTopExtensionsPath
      : getTopNExtensionsPath(numberOfExtensions);

  console.log(
    `Writing top ${chalk.green(numberOfExtensions)} extensions to ${chalk.green(
      topExtensionsPath
    )}`
  );

  await fs.promises.writeFile(
    topExtensionsPath,
    JSON.stringify(topExtensions, null, 2)
  );
};

await generateAndWriteTopExtensions(numExtensions);
