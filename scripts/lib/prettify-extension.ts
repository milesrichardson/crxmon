import { $ } from "zx";
import { getExtensionPath } from "./extension-fs.js";

import { withCdRepoRoot } from "./with-cd-repo-root.js";

export const prettifyExtension = async ({
  extensionId,
}: {
  extensionId: string;
}) =>
  withCdRepoRoot(async ({}) => {
    const extensionPath = getExtensionPath({
      extensionId,
      relativeFromProjectCwd: true,
    });

    const flags = [
      "--no-editorconfig",
      "--no-config",
      "--config",
      "extensions-prettierrc.json",
      "--ignore-path", // Without any value, this is equivalent to /dev/null
      "--write",
      // "--list-different",
      extensionPath,
    ];

    await $`yarn prettier ${flags}`.nothrow();
  });
