import { withCd } from "./with-cd.js";

/**
 * Runs a function in a shell with $.cwd set to $PROJECT_CWD
 *
 * NOTE: This does _not_ change `process.cwd()` within the _current process_.
 * It only changes `process.env` as seen by any child processes.
 *
 * https://github.com/google/zx#cwd
 */
export const withCdRepoRoot = <T>(
  fn: Parameters<typeof withCd<T>>[0],
  prefixOpts?: Parameters<typeof withCd<T>>[2]
) => {
  if (!process.env.PROJECT_CWD) {
    throw new Error("PROJECT_CWD is not set - is script running via Yarn?");
  }

  return withCd(fn, process.env.PROJECT_CWD, prefixOpts);
};
