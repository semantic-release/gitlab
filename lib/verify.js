import got from "got";
import _debug from "debug";
const debug = _debug("semantic-release:gitlab");
import AggregateError from "aggregate-error";
import resolveConfig from "./resolve-config.js";
import getProjectContext from "./get-project-context.js";
import getError from "./get-error.js";
import { validateOptions } from "./validate-options.js";

export default async (pluginConfig, context) => {
  const {
    options: { repositoryUrl },
    logger,
  } = context;
  const { gitlabToken, gitlabUrl, gitlabApiUrl, proxy, ...options } = resolveConfig(pluginConfig, context);
  const { projectPath, projectApiUrl } = getProjectContext(context, gitlabUrl, gitlabApiUrl, repositoryUrl);

  debug("apiUrl: %o", gitlabApiUrl);
  debug("projectPath: %o", projectPath);

  // Validate plugin options using the new validation system
  const errors = validateOptions(options);

  if (!projectPath) {
    errors.push(getError("EINVALIDGITLABURL"));
  }

  if (!gitlabToken) {
    errors.push(getError("ENOGLTOKEN", { repositoryUrl }));
  }

  if (gitlabToken && projectPath) {
    let projectAccess;
    let groupAccess;

    logger.log("Verify GitLab authentication (%s)", gitlabApiUrl);

    try {
      ({
        permissions: { project_access: projectAccess, group_access: groupAccess },
      } = await got
        .get(projectApiUrl, {
          headers: { "PRIVATE-TOKEN": gitlabToken },
          ...proxy,
        })
        .json());
      if (
        context.options.dryRun &&
        !((projectAccess && projectAccess.access_level >= 10) || (groupAccess && groupAccess.access_level >= 10))
      ) {
        errors.push(getError("EGLNOPULLPERMISSION", { projectPath }));
      } else if (
        !((projectAccess && projectAccess.access_level >= 30) || (groupAccess && groupAccess.access_level >= 30))
      ) {
        errors.push(getError("EGLNOPUSHPERMISSION", { projectPath }));
      }
    } catch (error) {
      if (error.response && error.response.statusCode === 401) {
        errors.push(getError("EINVALIDGLTOKEN", { projectPath }));
      } else if (error.response && error.response.statusCode === 404) {
        errors.push(getError("EMISSINGREPO", { projectPath }));
      } else {
        throw error;
      }
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};
