import { $, chalk } from "zx";
import { withCdRepoRoot } from "./lib/with-cd-repo-root.js";

const YarnVars: EnvironmentVariablesFromYarn = {
  PROJECT_CWD: process.env.PROJECT_CWD,
  INIT_CWD: process.env.INIT_CWD,
  npm_package_name: process.env.npm_package_name,
  npm_package_version: process.env.npm_package_version,
  npm_package_json: process.env.npm_package_json,
  npm_execpath: process.env.npm_execpath,
  npm_node_execpath: process.env.npm_node_execpath,
  npm_config_user_agent: process.env.npm_config_user_agent,
  npm_lifecycle_event: process.env.npm_lifecycle_event,
};

void (async function () {
  withCdRepoRoot(
    async ({ echo, console }) => {
      const printYarnVars = () => {
        Object.entries(YarnVars).forEach(([key, value]) => {
          echo(chalk.green(`[process.env.${key}]`), value);
        });
      };

      echo("[+] withCdRepoRoot (set $.cwd = PROJECT_CWD)");
      console.log(chalk.green("[process.cwd]"), process.cwd());

      Object.entries(YarnVars).forEach(([key, value]) => {
        echo(chalk.green(`[process.env.${key}]`), value);
      });

      await $`pwd`;
      await $`ls -la`;

      printYarnVars();
    },
    {
      prefix: (rootDir) => chalk.gray(`[repoRoot: ${rootDir}]`),
    }
  );
})();
