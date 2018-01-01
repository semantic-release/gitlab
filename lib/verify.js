const parseGithubUrl = require('parse-github-url');
const urlJoin = require('url-join');
const got = require('got');
const SemanticReleaseError = require('@semantic-release/error');
const resolveConfig = require('./resolve-config');

module.exports = async (pluginConfig, {repositoryUrl}, logger) => {
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix} = resolveConfig(pluginConfig);

  if (!gitlabToken) {
    throw new SemanticReleaseError('No GitLab token specified.', 'ENOGLTOKEN');
  }

  const {name: repo, owner} = parseGithubUrl(repositoryUrl);
  if (!owner || !repo) {
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
      urlJoin(gitlabUrl, gitlabApiPathPrefix, `/projects/${owner}%2F${repo}`),
      {json: true, headers: {'Private-Token': gitlabToken}}
    ));
  } catch (err) {
    if (err.statusCode === 401) {
      throw new SemanticReleaseError('Invalid GitLab token.', 'EINVALIDGLTOKEN');
    } else if (err.statusCode === 404) {
      throw new SemanticReleaseError(`The repository ${owner}/${repo} doesn't exist.`, 'EMISSINGREPO');
    }
    throw err;
  }

  if (!((projectAccess && projectAccess.access_level >= 30) || (groupAccess && groupAccess.access_level >= 30))) {
    throw new SemanticReleaseError(
      `The GitLab token doesn't allow to push on the repository ${owner}/${repo}.`,
      'EGHNOPERMISSION'
    );
  }
};
