import minimist, { type ParsedArgs } from "minimist";

import { getExtensionPublicKey } from "./lib/extension-crypto.js";

const {
  _: [crxPath],
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
  console.log("Usage: yarn zx scripts/get-crx-key.ts <pathToCrxFile>");
};

if (help) {
  usage();
  process.exit(0);
}

if (!crxPath) {
  usage();
  process.exit(1);
}

const pubkey = await getExtensionPublicKey(crxPath);

console.log(pubkey);
