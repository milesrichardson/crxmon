import minimist, { type ParsedArgs } from "minimist";

import { fetchLatestExtensionInfo } from "./lib/extension-updates.js";
import { getTopExtensions } from "./lib/top-extensions.js";

const {
  _: [extensionIdOrIdsOrTop100],
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
    "Usage: yarn zx scripts/fetch-latest-versions.ts <top100 | top500 | top1000 | extension ID or comma-separated list of extension IDs>"
  );
};

if (help) {
  usage();
  process.exit(0);
}

if (!extensionIdOrIdsOrTop100) {
  usage();
  process.exit(1);
}

let extensionIdOrIds: string | string[] = extensionIdOrIdsOrTop100;

if (extensionIdOrIds === "top100") {
  const top100 = await getTopExtensions();
  extensionIdOrIds = top100.map((ext) => ext.id);
} else if (extensionIdOrIds === "top500") {
  const top500 = await getTopExtensions(500);
  extensionIdOrIds = top500.map((ext) => ext.id);
} else if (extensionIdOrIds === "top1000") {
  const top1000 = await getTopExtensions(1000);
  extensionIdOrIds = top1000.map((ext) => ext.id);
}

const infos = await fetchLatestExtensionInfo({ extensionIdOrIds });

console.log(JSON.stringify(infos, null, 2));
