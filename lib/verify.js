const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const AggregateError = require('aggregate-error');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');
const getError = require('./get-error');

module.exports = async (pluginConfig, {options: {repositoryUrl}, logger}) => {
  const errors = [];
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix} = resolveConfig(pluginConfig);
  const repoId = getRepoId(gitlabUrl, repositoryUrl);
  debug('repoId: %o', repoId);

  if (!repoId) {
    errors.push(getError('EINVALIDGITLABURL'));
  }

  const apiUrl = urlJoin(gitlabUrl, gitlabApiPathPrefix);
  debug('apiUrl: %o', apiUrl);

  logger.log('Verify GitLab authentication (%s)', apiUrl);

  if (gitlabToken) {
    let projectAccess;
    let groupAccess;

    try {
      ({
        body: {
          permissions: {project_access: projectAccess, group_access: groupAccess},
        },
      } = await got.get(urlJoin(apiUrl, `/projects/${encodeURIComponent(repoId)}`), {
        json: true,
        headers: {'Private-Token': gitlabToken},
      }));
    } catch (err) {
      if (err.statusCode === 401) {
        errors.push(getError('EINVALIDGLTOKEN', {repoId}));
      } else if (err.statusCode === 404) {
        errors.push(getError('EMISSINGREPO', {repoId}));
      } else {
        throw err;
      }
    }

    if (!((projectAccess && projectAccess.access_level >= 30) || (groupAccess && groupAccess.access_level >= 30))) {
      errors.push(getError('EGHNOPERMISSION', {repoId}));
    }
  } else {
    errors.push(getError('ENOGLTOKEN', {repoId}));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};
