import { $ } from "zx";
import { getExtensionPath } from "./extension-fs.js";

import { withCdRepoRoot } from "./with-cd-repo-root.js";

export const prettifyExtension = async ({
  extensionId,
  extensionPath,
  throwErrors = false,
}: {
  extensionId: string;

  /**
   * Optional local path to the directory containing the unpacked extension
   * files.
   *
   * If not specified, the path will be constructed using
   * the {@link getExtensionPath} function.
   *
   */
  extensionPath?: string;

  /**
   * Set to true to throw errors (default false)
   */
  throwErrors?: boolean;
}) =>
  withCdRepoRoot(async ({}) => {
    extensionPath =
      extensionPath ??
      getExtensionPath({
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

    if (throwErrors) {
      await $`yarn prettier ${flags}`;
    } else {
      await $`yarn prettier ${flags}`.nothrow();
    }
  });
