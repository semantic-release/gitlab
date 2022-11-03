const {isString, isPlainObject, isNil, isArray} = require('lodash');
const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const AggregateError = require('aggregate-error');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');
const getError = require('./get-error');

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

module.exports = async (pluginConfig, context) => {
  const {
    options: {repositoryUrl},
    logger,
  } = context;
  const {gitlabToken, gitlabUrl, gitlabApiUrl, proxy, ...options} = resolveConfig(pluginConfig, context);
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);
  debug('apiUrl: %o', gitlabApiUrl);
  debug('repoId: %o', repoId);

  const isValid = (option, value) => {
    const validator = VALIDATORS[option];
    return isNil(value) || isNil(validator) || VALIDATORS[option](value);
  };

  const errors = Object.entries({...options})
    .filter(([option, value]) => !isValid(option, value))
    .map(([option, value]) => getError(`EINVALID${option.toUpperCase()}`, {[option]: value}));

  if (!repoId) {
    errors.push(getError('EINVALIDGITLABURL'));
  }

  if (!gitlabToken) {
    errors.push(getError('ENOGLTOKEN', {repositoryUrl}));
  }

  if (gitlabToken && repoId) {
    let projectAccess;
    let groupAccess;

    logger.log('Verify GitLab authentication (%s)', gitlabApiUrl);

    try {
      ({
        permissions: {project_access: projectAccess, group_access: groupAccess},
      } = await got
        .get(urlJoin(gitlabApiUrl, `/projects/${encodeURIComponent(repoId)}`), {
          headers: {'PRIVATE-TOKEN': gitlabToken},
          ...proxy,
        })
        .json());
      if (
        context.options.dryRun &&
        !((projectAccess && projectAccess.access_level >= 10) || (groupAccess && groupAccess.access_level >= 10))
      ) {
        errors.push(getError('EGLNOPULLPERMISSION', {repoId}));
      } else if (
        !((projectAccess && projectAccess.access_level >= 30) || (groupAccess && groupAccess.access_level >= 30))
      ) {
        errors.push(getError('EGLNOPUSHPERMISSION', {repoId}));
      }
    } catch (error) {
      if (error.response && error.response.statusCode === 401) {
        errors.push(getError('EINVALIDGLTOKEN', {repoId}));
      } else if (error.response && error.response.statusCode === 404) {
        errors.push(getError('EMISSINGREPO', {repoId}));
      } else {
        throw error;
      }
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};
