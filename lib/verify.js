const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const SemanticReleaseError = require('@semantic-release/error');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');

module.exports = async (pluginConfig, {repositoryUrl}, logger) => {
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix} = resolveConfig(pluginConfig);

  if (!gitlabToken) {
    throw new SemanticReleaseError('No GitLab token specified.', 'ENOGLTOKEN');
  }

  const repoId = getRepoId(gitlabUrl, repositoryUrl);

  debug('repoId: %o', repoId);

  if (!repoId) {
    throw new SemanticReleaseError(
      `The git repository URL ${repositoryUrl} is not a valid GitLab URL.`,
      'EINVALIDGITURL'
    );
  }

  logger.log('Verify GitLab authentication (%s)', urlJoin(gitlabUrl, gitlabApiPathPrefix));

  let projectAccess;
  let groupAccess;

  try {
    ({body: {permissions: {project_access: projectAccess, group_access: groupAccess}}} = await got.get(
      urlJoin(gitlabUrl, gitlabApiPathPrefix, `/projects/${encodeURIComponent(repoId)}`),
      {json: true, headers: {'Private-Token': gitlabToken}}
    ));
  } catch (err) {
    if (err.statusCode === 401) {
      throw new SemanticReleaseError('Invalid GitLab token.', 'EINVALIDGLTOKEN');
    } else if (err.statusCode === 404) {
      throw new SemanticReleaseError(`The repository ${repoId} doesn't exist.`, 'EMISSINGREPO');
    }
    throw err;
  }

  if (!((projectAccess && projectAccess.access_level >= 30) || (groupAccess && groupAccess.access_level >= 30))) {
    throw new SemanticReleaseError(
      `The GitLab token doesn't allow to push on the repository ${repoId}.`,
      'EGHNOPERMISSION'
    );
  }
};
