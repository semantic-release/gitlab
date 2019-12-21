const {isString, isPlainObject, isArray} = require('lodash');
const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const AggregateError = require('aggregate-error');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');
const getError = require('./get-error');

const isNonEmptyString = value => isString(value) && value.trim();
const isStringOrStringArray = value => isNonEmptyString(value) || (isArray(value) && value.every(isNonEmptyString));
const isArrayOf = validator => array => isArray(array) && array.every(value => validator(value));

const VALIDATORS = {
  assets: isArrayOf(
    asset => isStringOrStringArray(asset) || (isPlainObject(asset) && isStringOrStringArray(asset.path))
  ),
};

module.exports = async (pluginConfig, context) => {
  const {
    options: {repositoryUrl},
    logger,
  } = context;
  const errors = [];
  const {gitlabToken, gitlabUrl, gitlabApiUrl, assets} = resolveConfig(pluginConfig, context);
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);
  debug('apiUrl: %o', gitlabApiUrl);
  debug('repoId: %o', repoId);

  if (!repoId) {
    errors.push(getError('EINVALIDGITLABURL'));
  }

  if (assets && !VALIDATORS.assets(assets)) {
    errors.push(getError('EINVALIDASSETS'));
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
        body: {
          permissions: {project_access: projectAccess, group_access: groupAccess},
        },
      } = await got.get(urlJoin(gitlabApiUrl, `/projects/${encodeURIComponent(repoId)}`), {
        json: true,
        headers: {'Private-Token': gitlabToken},
      }));

      if (!((projectAccess && projectAccess.access_level >= 30) || (groupAccess && groupAccess.access_level >= 30))) {
        errors.push(getError('EGLNOPERMISSION', {repoId}));
      }
    } catch (error) {
      if (error.statusCode === 401) {
        errors.push(getError('EINVALIDGLTOKEN', {repoId}));
      } else if (error.statusCode === 404) {
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
