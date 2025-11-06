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

const isValidGenericPackageLabel = (label) => {
  // GitLab generic package filename restrictions
  // Can contain: A-Z, a-z, 0-9, . _ - + ~ @ /
  // Cannot start with: ~ or @
  // Cannot end with: ~ or @
  // Cannot contain spaces
  if (!label) return true; // label is optional
  if (typeof label !== "string") return false;
  if (/\s/.test(label)) return false; // no spaces
  if (/^[~@]/.test(label)) return false; // cannot start with ~ or @
  if (/[~@]$/.test(label)) return false; // cannot end with ~ or @
  // Check if it only contains allowed characters
  if (!/^[A-Za-z0-9._\-+~@/]+$/.test(label)) return false;
  return true;
};

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

  // Validate generic package labels with specific error codes
  if (options.assets && Array.isArray(options.assets)) {
    options.assets.forEach((asset) => {
      if (isPlainObject(asset) && asset.target === "generic_package" && asset.label) {
        if (!isValidGenericPackageLabel(asset.label)) {
          errors.push(getError("EINVALIDGENERICPACKAGELABEL", { label: asset.label, asset }));
        }
      }
    });
  }

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
