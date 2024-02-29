export const YarnVars: EnvironmentVariablesFromYarn = {
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

export const GET_YARN_VAR = (varName: keyof EnvironmentVariablesFromYarn) => {
  if (!YarnVars[varName]) {
    throw new Error(`${varName} is not set - is script running via Yarn?`);
  }

  if (typeof YarnVars[varName] !== "string") {
    throw new Error(`${varName} is not string type`);
  }

  return YarnVars[varName] as string;
};
