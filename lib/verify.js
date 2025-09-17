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
    logger.log("Verify GitLab authentication (%s)", gitlabApiUrl);

    try {
      // First, get basic project information to ensure the project exists
      await got
        .get(projectApiUrl, {
          headers: { "PRIVATE-TOKEN": gitlabToken },
          ...proxy,
        })
        .json();

      // Use GraphQL to check user permissions
      debug("Checking permissions via GraphQL");
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
