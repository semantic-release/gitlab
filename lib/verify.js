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
  const { gitlabToken, gitlabUrl, gitlabApiUrl, gitlabGraphQlApiUrl, proxy, ...options } = resolveConfig(
    pluginConfig,
    context
  );
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

      // If we don't have direct access permissions (both are null), try GraphQL to get actual permissions
      if (!projectAccess && !groupAccess) {
        debug("Both project_access and group_access are null, checking permissions via GraphQL");
        try {
          const query = `
            query {
              project(fullPath: "${projectPath}") {
                userPermissions {
                  pushToRepository
                  readRepository
                }
              }
            }
          `;

          const graphqlResponse = await got
            .post(gitlabGraphQlApiUrl, {
              headers: {
                "Private-Token": gitlabToken,
                "Content-Type": "application/json",
                Accept: "application/graphql-response+json",
              },
              json: { query },
              ...proxy,
            })
            .json();

          if (graphqlResponse.errors) {
            debug("GraphQL query returned errors: %O", graphqlResponse.errors);
            throw new Error(`GraphQL query failed: ${graphqlResponse.errors.map((e) => e.message).join(", ")}`);
          }

          const permissions = graphqlResponse.data?.project?.userPermissions;
          if (!permissions) {
            debug("No permissions data returned from GraphQL query");
            throw new Error("Unable to determine permissions from GraphQL response");
          }

          debug("GraphQL permissions: %O", permissions);

          // Check permissions based on GraphQL response
          if (context.options.dryRun && !permissions.readRepository) {
            errors.push(getError("EGLNOPULLPERMISSION", { projectPath }));
          } else if (!permissions.pushToRepository) {
            errors.push(getError("EGLNOPUSHPERMISSION", { projectPath }));
          }
        } catch (graphqlError) {
          debug("GraphQL permission check failed: %O", graphqlError);
          // If GraphQL fails, fall back to the original error for null permissions
          if (context.options.dryRun) {
            errors.push(getError("EGLNOPULLPERMISSION", { projectPath }));
          } else {
            errors.push(getError("EGLNOPUSHPERMISSION", { projectPath }));
          }
        }
      } else {
        // Use original logic for explicit permission levels
        if (context.options.dryRun && !hasDirectPullAccess) {
          errors.push(getError("EGLNOPULLPERMISSION", { projectPath }));
        } else if (!hasDirectPushAccess) {
          errors.push(getError("EGLNOPUSHPERMISSION", { projectPath }));
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
