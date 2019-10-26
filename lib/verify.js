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
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix, assets} = resolveConfig(pluginConfig, context);
  const repoId = getRepoId(gitlabUrl, repositoryUrl);
  debug('repositoryUrl: %s', repositoryUrl);
  debug('gitlabToken: %s', gitlabToken);
  debug('gitlabUrl: %s', gitlabUrl);
  debug('gitlabApiPathPrefix: %s', gitlabApiPathPrefix);
  debug('assets: %s', assets);
  debug('repoId: %o', repoId);

  if (!repoId) {
    errors.push(getError('EINVALIDGITLABURL', {gitlabUrl, repositoryUrl}));
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

    const apiUrl = urlJoin(gitlabUrl, gitlabApiPathPrefix);
    debug('apiUrl: %o', apiUrl);

    logger.log('Verify GitLab authentication (%s)', apiUrl);

    const repositoryApiUrl = urlJoin(apiUrl, `/projects/${encodeURIComponent(repoId)}`);
    debug('Url used for api verification call: %s', repositoryApiUrl);

    try {
      ({
        body: {
          permissions: {project_access: projectAccess, group_access: groupAccess},
        },
      } = await got.get(repositoryApiUrl, {
        json: true,
        headers: {'Private-Token': gitlabToken},
      }));

      if (!((projectAccess && projectAccess.access_level >= 30) || (groupAccess && groupAccess.access_level >= 30))) {
        errors.push(getError('EGLNOPERMISSION', {repoId, gitlabUrl}));
      }
    } catch (error) {
      debug('Error thrown: %O', error);
      if (error.statusCode === 401) {
        errors.push(getError('EINVALIDGLTOKEN', {repoId, gitlabUrl}));
      } else if (error.statusCode === 404) {
        if (error.statusMessage === 'Project Not Found' || error.body.error.includes('Project Not Found')) {
          errors.push(getError('EMISSINGREPO', {repoId, gitlabUrl}));
        } else {
          errors.push(getError('EUNEXPECTED404q', {repoId, repositoryApiUrl, statusMessage: error.statusMessage}));
        }
      } else {
        throw error;
      }
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};
