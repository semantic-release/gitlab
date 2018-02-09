const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');

module.exports = async (pluginConfig, {repositoryUrl}, {gitHead, gitTag, notes}, logger) => {
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix} = resolveConfig(pluginConfig);
  const repoId = encodeURIComponent(getRepoId(gitlabUrl, repositoryUrl));
  const apiUrl = urlJoin(gitlabUrl, gitlabApiPathPrefix);

  debug('repoId: %o', repoId);
  debug('release name: %o', gitTag);
  debug('release ref: %o', gitHead);

  debug('Update git tag %o with commit %o and release description', gitTag, gitHead);
  await got.post(urlJoin(apiUrl, `/projects/${repoId}/repository/tags/${gitTag}/release`), {
    json: true,
    headers: {'PRIVATE-TOKEN': gitlabToken},
    body: {tag_name: gitTag, description: notes}, // eslint-disable-line camelcase
  });

  logger.log('Published GitLab release: %s', gitTag);
};
