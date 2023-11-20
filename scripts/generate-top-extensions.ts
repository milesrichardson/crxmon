import fs from "node:fs";

import {
  getExtensionDataPaths,
  getAllExtensions,
} from "./lib/top-extensions.js";

const generateAndWriteTopExtensions = async (
  numberOfExtensions: number = 100
) => {
  const { topExtensionsPath } = getExtensionDataPaths();
  const allExtensions = await getAllExtensions();
  const topExtensions = allExtensions.slice(0, numberOfExtensions);

  await fs.promises.writeFile(
    topExtensionsPath,
    JSON.stringify(topExtensions, null, 2)
  );
};

await generateAndWriteTopExtensions(100);
