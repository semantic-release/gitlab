import { isString, isPlainObject, isNil, isArray } from "lodash-es";
import got from "got";
import _debug from "debug";
const debug = _debug("semantic-release:gitlab");
import AggregateError from "aggregate-error";
import resolveConfig from "./resolve-config.js";
import getProjectContext from "./get-project-context.js";
import getError from "./get-error.js";

const isNonEmptyString = (value) => isString(value) && value.trim();
const isStringOrStringArray = (value) =>
  isNonEmptyString(value) || (isArray(value) && value.every((item) => isNonEmptyString(item)));
const isArrayOf = (validator) => (array) => isArray(array) && array.every((value) => validator(value));
const canBeDisabled = (validator) => (value) => value === false || validator(value);

const VALIDATORS = {
  assets: isArrayOf(
    (asset) =>
      isStringOrStringArray(asset) ||
      (isPlainObject(asset) && (isNonEmptyString(asset.url) || isStringOrStringArray(asset.path)))
  ),
  failTitle: canBeDisabled(isNonEmptyString),
  failComment: canBeDisabled(isNonEmptyString),
  labels: canBeDisabled(isNonEmptyString),
  assignee: isNonEmptyString,
};

export default async (pluginConfig, context) => {
  const {
    options: { repositoryUrl },
    logger,
  } = context;
  const { gitlabToken, gitlabUrl, gitlabApiUrl, proxy, ...options } = resolveConfig(pluginConfig, context);
  const { projectPath, projectApiUrl } = getProjectContext(context, gitlabUrl, gitlabApiUrl, repositoryUrl);

  debug("apiUrl: %o", gitlabApiUrl);
  debug("projectPath: %o", projectPath);

  const isValid = (option, value) => {
    const validator = VALIDATORS[option];
    return isNil(value) || isNil(validator) || VALIDATORS[option](value);
  };

  const errors = Object.entries({ ...options })
    .filter(([option, value]) => !isValid(option, value))
    .map(([option, value]) => getError(`EINVALID${option.toUpperCase()}`, { [option]: value }));

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
      const projectData = await got
        .get(projectApiUrl, {
          headers: { "PRIVATE-TOKEN": gitlabToken },
          ...proxy,
        })
        .json();

      ({
        permissions: { project_access: projectAccess, group_access: groupAccess },
      } = projectData);

      // Check if we have direct project or group access
      const hasDirectPushAccess =
        (projectAccess && projectAccess.access_level >= 30) || (groupAccess && groupAccess.access_level >= 30);
      const hasDirectPullAccess =
        (projectAccess && projectAccess.access_level >= 10) || (groupAccess && groupAccess.access_level >= 10);

      // Original logic for direct access
      if (context.options.dryRun && !hasDirectPullAccess) {
        // If we have explicit low permissions, fail immediately
        if ((projectAccess && projectAccess.access_level < 10) || (groupAccess && groupAccess.access_level < 10)) {
          errors.push(getError("EGLNOPULLPERMISSION", { projectPath }));
        } else if (!projectAccess && !groupAccess) {
          // If both are null, try alternative permission verification for pull access
          try {
            await got
              .get(`${projectApiUrl}/repository/branches`, {
                headers: { "PRIVATE-TOKEN": gitlabToken },
                ...proxy,
              })
              .json();
            debug("Verified pull permissions through branches endpoint");
          } catch (pullError) {
            if (pullError.response && pullError.response.statusCode === 403) {
              errors.push(getError("EGLNOPULLPERMISSION", { projectPath }));
            } else {
              // For other errors, assume permission granted to avoid false negatives
              debug("Pull permission check failed with non-403 error, assuming access granted");
            }
          }
        }
      } else if (!hasDirectPushAccess) {
        // If we have explicit low permissions, fail immediately
        if ((projectAccess && projectAccess.access_level < 30) || (groupAccess && groupAccess.access_level < 30)) {
          errors.push(getError("EGLNOPUSHPERMISSION", { projectPath }));
        } else if (!projectAccess && !groupAccess) {
          // If both are null, try alternative permission verification
          try {
            await got
              .get(`${projectApiUrl}/variables`, {
                headers: { "PRIVATE-TOKEN": gitlabToken },
                ...proxy,
              })
              .json();
            debug("Verified push permissions through variables endpoint");
          } catch (permissionError) {
            if (permissionError.response && permissionError.response.statusCode === 403) {
              errors.push(getError("EGLNOPUSHPERMISSION", { projectPath }));
            } else {
              // For other errors, assume permission granted to avoid false negatives
              debug("Push permission check failed with non-403 error, assuming access granted");
            }
          }
        }
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
