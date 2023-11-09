/**
 * Yarn provides some environment variables when running scripts and binaries.
 *
 * https://yarnpkg.com/advanced/lifecycle-scripts/#environment-variables
 */
interface EnvironmentVariablesFromYarn {
  /**
   * The absolute path to the project root directory
   *
   * > `$PROJECT_CWD` is the root of the project on the filesystem.
   **/
  PROJECT_CWD?: string;
  /**
   * The absolute path to the directory runnign the script
   *
   * > `$INIT_CWD` represents the directory from which the script has been
   * invoked. This isn't the same as the cwd, which for scripts is always equal
   * to the closest package root.
   **/
  INIT_CWD?: string;
  /**
   * `$npm_package_name` is the name of the package that lists the script being
   * executed.
   */
  npm_package_name?: string;
  /**
   * `$npm_package_version` is the version of the package that lists the script
   * being executed.
   */
  npm_package_version?: string;
  /**
   * `$npm_package_json` is the absolute path to the `package.json` of the
   * package that lists the script being executed.
   */
  npm_package_json?: string;
  /**
   * `$npm_execpath` is the absolute path to the `yarn` binary
   */
  npm_execpath?: string;
  /**
   * `$npm_node_execpath` is the absolute path to the `node` binary
   */
  npm_node_execpath?: string;
  /**
   * `$npm_config_user_agent` is a string defining the Yarn version currently in
   * use
   */
  npm_config_user_agent?: string;
  /**
   * `$npm_lifecycle_event` is the name of the script or lifecycle event, if
   * relevant
   */
  npm_lifecycle_event?: string;
}

namespace NodeJS {
  interface ProcessEnv extends EnvironmentVariablesFromYarn {}
}
