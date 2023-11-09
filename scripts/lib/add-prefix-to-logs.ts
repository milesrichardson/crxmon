import { $, LogEntry, echo } from "zx";

/**
 * Function to call for logging entries with a `kind` matching `EntryKind`
 */
type CustomLogger<EntryKind extends LogEntry["kind"]> = (
  prefix: string,
  entry: Extract<LogEntry, { kind: EntryKind }>,
  originalLog: typeof $.log
) => void;

/**
 * Function to call for logging entries with a `data` field that is not a `Buffer`.
 */
type UnbufferedDataLogger<
  EntryKind extends Extract<LogEntry, { data: any }>["kind"],
  EntryData extends Extract<
    Extract<LogEntry, { kind: EntryKind }>,
    { data: any }
  >["data"],
> = (
  prefix: string,
  entry: Extract<
    LogEntry,
    { kind: "custom" | "stdout" | "stderr"; data: EntryData }
  >,
  originalLog: typeof $.log
) => void;

/**
 * Function to call for logging entries with a `data` field that is a `Buffer`.
 * The `firstLineInBuffer` will be `true` when the line is the first in a buffer.
 */
type BufferedDataLogger<
  EntryKind extends Extract<LogEntry, { data: any }>["kind"],
> = (
  prefix: string,
  entry: Extract<LogEntry, { kind: EntryKind; data: Buffer }>,
  originalLog: typeof $.log,
  firstLineInBuffer: boolean
) => void;

/**
 * Options for configuring the prefix to use, including the prefix itself,
 * and callbacks that are called based on the type of log entry.
 */
export type AddPrefixOpts = {
  /**
   * The prefix to add to each log entry. If not supplied, then no prefix will
   * be added (although the functions will still be wrapped).
   */
  prefix?: string;
  /**
   * Optional callback for whether or not to prefix the log entry
   *
   * Defaults to prefixing stdout and stderr entries
   * */
  shouldPrefixLog?: (entryKind: LogEntry) => boolean;
  /**
   * Function to call when prefixing a `cd` log entry
   */
  logCd?: CustomLogger<"cd">;
  /**
   * Function to call when prefixing a `retry` log entry
   */
  logRetry?: CustomLogger<"retry">;
  /**
   * Function to call when prefixing a `cmd` log entry
   */
  logCmd?: CustomLogger<"cmd">;
  /**
   * Function to call when prefixing a `fetch` log entry
   */
  logFetch?: CustomLogger<"fetch">;
  /**
   * Function to call when prefixing a `custom`, `stdout`, or `stderr` log entry
   * where the type of `entry.data` is a `string`
   */
  logString?: UnbufferedDataLogger<"custom" | "stdout" | "stderr", string>;
  /**
   * Function to call when prefixing a `custom`, `stdout`, or `stderr` log entry
   * where the type of `entry.data` is a `Buffer`
   */
  logBuffer?: BufferedDataLogger<"custom" | "stdout" | "stderr">;
  /**
   * Function to call when prefixing a `custom`, `stdout`, or `stderr` log entry
   * where the type of `entry.data` is not a `string`, and not a `Buffer`
   */
  logAny?:
    | BufferedDataLogger<"custom" | "stdout" | "stderr">
    | UnbufferedDataLogger<
        "custom" | "stdout" | "stderr",
        Exclude<any, Buffer>
      >;

  /**
   * Pass in an echo function to override
   */
  echo?: typeof echo;

  /**
   * The `console` object for which the `log`, `error`, and `warn` functions
   * should be wrapped with a function that adds a prefix to their messages.
   */
  console?: Pick<typeof console, "log" | "error" | "warn">;
};

/**
 * Given an originalLog function and prefix options, construct a new log function
 * that prefixes its messages with prefix, and also construct new wrapped versions
 * of `echo` and `console` that prefix their messages in the same way.
 *
 * @returns Object containing the new log, echo, and console functions
 */
export const addPrefixToLogs = (
  originalLog: typeof $.log,
  opts: AddPrefixOpts
): {
  log: typeof $.log;
  echo: typeof echo;
  console: Pick<typeof console, "log" | "error" | "warn">;
} => {
  const {
    echo: originalEcho = echo,
    console: originalConsole = console,
    prefix = "",
    shouldPrefixLog = (entry: LogEntry) =>
      !!opts.prefix ? ["stdout", "stderr"].includes(entry.kind) : false,
    logCd = (prefix, entry, originalLog) =>
      originalLog({ ...entry, dir: `${prefix}${entry.dir}` }),
    logRetry = (prefix, entry, originalLog) =>
      originalLog({ ...entry, error: `${prefix}${entry.error}` }),
    logCmd = (prefix, entry, originalLog) =>
      originalLog({ ...entry, cmd: `${prefix}${entry.cmd}` }),
    logFetch = (_prefix, entry, originalLog) => {
      console.warn("Not prefixing fetch, pass logFetch for cutom fetch logger");
      originalLog(entry);
    },
    logString = (_prefix, entry, originalLog) => {
      originalLog({ ...entry, data: `${prefix}${entry.data}` });
    },
    logAny = (_prefix, entry, originalLog, _firstLineInBuffer) => {
      originalLog(entry);
    },
    logBuffer = (prefix, entry, originalLog, firstLineInBuffer) => {
      if (firstLineInBuffer) {
        // First message doesn't start with a new line, so wouldn't get its
        // newline replaced by the logic below. Thus, for the first line, add
        // the prefix to the entire buffer.
        originalLog({
          ...entry,
          data: Buffer.from(`${prefix}`, "utf-8"),
        });
        firstLineInBuffer = false;
      }

      originalLog({
        ...entry,
        data: Buffer.from(
          // NOTE: a single entry can contain multiple lines of output.
          // We need to prepend the prefix to each line.
          entry.data
            .toString("utf-8")
            // replace all newlines except the last one
            // https://stackoverflow.com/a/28673744/3793499
            .replace(/[\n](?=.*[\n])/g, `\n${prefix}`),
          "utf-8"
        ),
      });
    },
  } = opts;

  let firstLineInBuffer = true;

  const newLog: typeof $.log = (entry) => {
    // Reset buffer if we're not logging a buffer (logging two buffers in a row
    // would cause the second buffer to be prefixed with the first buffer's prefix,
    // but that should be pretty rrae, since usually a cmd precedes a buffer)
    if (
      firstLineInBuffer === false &&
      (!("data" in entry) || !isBuffer(entry.data))
    ) {
      firstLineInBuffer = true;
    }

    if (!shouldPrefixLog(entry)) {
      originalLog(entry);
      return;
    }

    if (!("data" in entry) && entry.kind === "cd") {
      logCd(prefix, entry, originalLog);
    } else if (!("data" in entry) && entry.kind === "retry") {
      logRetry(prefix, entry, originalLog);
    } else if (!("data" in entry) && entry.kind === "cmd") {
      logCmd(prefix, entry, originalLog);
    } else if (!("data" in entry) && entry.kind === "fetch") {
      logFetch(prefix, entry, originalLog);
    } else if ("data" in entry && isBuffer(entry.data)) {
      logBuffer(prefix, entry, originalLog, firstLineInBuffer);
      firstLineInBuffer = false;
    } else if (
      "data" in entry &&
      entry.kind === "custom" &&
      typeof entry.data === "string"
    ) {
      logString(prefix, entry, originalLog);
    } else if ("data" in entry) {
      logAny(prefix, entry, originalLog, firstLineInBuffer);
    } else {
      throw new Error("Unhandled log entry: " + JSON.stringify(entry));
    }
  };

  return {
    log: newLog,
    // NOTE: Pull out first arg so that we can prefix without adding a space (should be caller's choice)
    echo: (a, ...rest) => {
      originalEcho(`${prefix}${a}`, ...rest);
    },
    console: {
      log: (a, ...rest) => originalConsole.log(`${prefix}${a}`, ...rest),
      error: (a, ...rest) => originalConsole.error(`${prefix}${a}`, ...rest),
      warn: (a, ...rest) => originalConsole.warn(`${prefix}${a}`, ...rest),
    },
  };
};

const isBuffer = (data: any): data is Buffer => Buffer.isBuffer(data);
