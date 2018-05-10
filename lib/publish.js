const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');

module.exports = async (pluginConfig, {options: {repositoryUrl}, nextRelease: {gitTag, gitHead, notes}, logger}) => {
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix} = resolveConfig(pluginConfig);
  const repoId = getRepoId(gitlabUrl, repositoryUrl);
  const apiUrl = urlJoin(gitlabUrl, gitlabApiPathPrefix);
  const gitTagEncoded = encodeURIComponent(gitTag);

  debug('repoId: %o', repoId);
  debug('release name: %o', gitTag);
  debug('release ref: %o', gitHead);

  debug('Update git tag %o with commit %o and release description', gitTag, gitHead);
  await got.post(urlJoin(apiUrl, `/projects/${encodeURIComponent(repoId)}/repository/tags/${gitTagEncoded}/release`), {
    json: true,
    headers: {'PRIVATE-TOKEN': gitlabToken},
    body: {tag_name: gitTag, description: notes}, // eslint-disable-line camelcase
  });

  logger.log('Published GitLab release: %s', gitTag);

  return {url: urlJoin(gitlabUrl, repoId, `/tags/${gitTagEncoded}`), name: 'GitHub release'};
};
