const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const AggregateError = require('aggregate-error');
const SemanticReleaseError = require('@semantic-release/error');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');

module.exports = async (pluginConfig, {options: {repositoryUrl}, logger}) => {
  const errors = [];
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix} = resolveConfig(pluginConfig);
  const repoId = getRepoId(gitlabUrl, repositoryUrl);
  debug('repoId: %o', repoId);

  if (!repoId) {
    errors.push(new SemanticReleaseError('The git repository URL is not a valid GitLab URL.', 'EINVALIDGITLABURL'));
  }

  const apiUrl = urlJoin(gitlabUrl, gitlabApiPathPrefix);
  debug('apiUrl: %o', apiUrl);

  logger.log('Verify GitLab authentication (%s)', apiUrl);

  if (gitlabToken) {
    let projectAccess;
    let groupAccess;

    try {
      ({body: {permissions: {project_access: projectAccess, group_access: groupAccess}}} = await got.get(
        urlJoin(apiUrl, `/projects/${encodeURIComponent(repoId)}`),
        {json: true, headers: {'Private-Token': gitlabToken}}
      ));
    } catch (err) {
      if (err.statusCode === 401) {
        errors.push(new SemanticReleaseError('Invalid GitLab token.', 'EINVALIDGLTOKEN'));
      } else if (err.statusCode === 404) {
        errors.push(new SemanticReleaseError(`The repository ${repoId} doesn't exist.`, 'EMISSINGREPO'));
      } else {
        throw err;
      }
    }

    if (!((projectAccess && projectAccess.access_level >= 30) || (groupAccess && groupAccess.access_level >= 30))) {
      errors.push(
        new SemanticReleaseError(
          `The GitLab token doesn't allow to push on the repository ${repoId}.`,
          'EGHNOPERMISSION'
        )
      );
    }
  } else {
    errors.push(new SemanticReleaseError('No GitLab token specified.', 'ENOGLTOKEN'));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
};
