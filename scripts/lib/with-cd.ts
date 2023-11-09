import { $, cd } from "zx";
import type { FnWithInjectablePrefixFunctions } from "./with-prefix.js";
import { withPrefix } from "./with-prefix.js";
import type { AddPrefixOpts } from "./add-prefix-to-logs.js";
import { normalizeThingOrThingifier } from "./utils.js";

type AddPrefixOptsWithPrefixer = Omit<AddPrefixOpts, "prefix"> & {
  /**
   * String or tranform function taking a dirname and returning a
   * string to use as the prefix for all logs within this shell. If undefined,
   * there will be no prefix.
   **/
  prefix: string | ((dir: string) => string);
};

/**
 * Runs a function in a shell after calling `cd(dir)` and setting $.cwd to dir
 *
 * NOTE: This does _not_ change `process.cwd()` within the _current process_.
 * It only changes `process.env` as seen by any child processes.
 *
 * https://github.com/google/zx#cwd
 */
export const withCd = <T>(
  fn: FnWithInjectablePrefixFunctions<T>,
  /**
   * The path of the directory to change to.
   */
  dir: string,
  /**
   * Optional parameters for prefixing the output
   * */
  prefixOpts?: AddPrefixOptsWithPrefixer
) => {
  const { prefix: prefixOrPrefixer, ...prefixRestOpts } =
    prefixOpts ?? ({} as Partial<AddPrefixOptsWithPrefixer>);

  // Move to the directory _before_ we start applying the prefix, so that
  // the cd log line shows above the log lines that are prefixed with its destination
  cd(dir);

  return withPrefix(
    (prefixedLoggingFunctions) => {
      $.cwd = dir;

      if ($.cwd !== dir) {
        throw new Error(`$.cwd (${$.cwd}) is not dir (${dir})`);
      }

      return fn(prefixedLoggingFunctions);
    },
    {
      prefix: normalizeThingOrThingifier(prefixOrPrefixer, dir),
      ...prefixRestOpts,
    }
  );
};
