const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');

module.exports = async (pluginConfig, context) => {
  const {
    options: {repositoryUrl},
    nextRelease: {gitTag, gitHead, notes},
    logger,
  } = context;
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix} = resolveConfig(pluginConfig, context);
  const repoId = getRepoId(gitlabUrl, repositoryUrl);
  const encodedRepoId = encodeURIComponent(repoId);
  const apiUrl = urlJoin(gitlabUrl, gitlabApiPathPrefix);
  const encodedGitTag = encodeURIComponent(gitTag);

  debug('repoId: %o', repoId);
  debug('release name: %o', gitTag);
  debug('release ref: %o', gitHead);

  debug('Update git tag %o with commit %o and release description', gitTag, gitHead);
  await got.post(urlJoin(apiUrl, `/projects/${encodedRepoId}/repository/tags/${encodedGitTag}/release`), {
    json: true,
    headers: {'PRIVATE-TOKEN': gitlabToken},
    body: {tag_name: gitTag, description: notes}, // eslint-disable-line camelcase
  });

  logger.log('Published GitLab release: %s', gitTag);

  return {url: urlJoin(gitlabUrl, encodedRepoId, `/tags/${encodedGitTag}`), name: 'GitHub release'};
};
