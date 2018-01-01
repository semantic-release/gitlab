const parseGithubUrl = require('parse-github-url');
const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:github');
const resolveConfig = require('./resolve-config');

module.exports = async (pluginConfig, {repositoryUrl}, {gitHead, gitTag, notes}, logger) => {
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix} = resolveConfig(pluginConfig);
  const {name: repo, owner} = parseGithubUrl(repositoryUrl);

  debug('release name: %o', gitTag);
  debug('release ref: %o', gitHead);

  try {
    // Test if the tag already exists
    await got.get(urlJoin(gitlabUrl, gitlabApiPathPrefix, `/projects/${owner}%2F${repo}/repository/tags/${gitTag}`), {
      json: true,
      headers: {'Private-Token': gitlabToken},
    });
    debug('The git tag %o already exists, update the release description', gitTag);
    // Update the release notes
    await got.post(
      urlJoin(gitlabUrl, gitlabApiPathPrefix, `/projects/${owner}%2F${repo}/repository/tags/${gitTag}/release`),
      {json: true, headers: {'Private-Token': gitlabToken}, body: {tag_name: gitTag, description: notes}} // eslint-disable-line camelcase
    );
  } catch (err) {
    // If the error is 404, the tag doesn't exist, otherwise it's an error
    if (err.statusCode !== 404) {
      throw err;
    }
    debug('Create git tag %o with commit %o and release description', gitTag, gitHead);
    await got.post(
      urlJoin(gitlabUrl, gitlabApiPathPrefix, `/projects/${owner}%2F${repo}/repository/tags/${gitTag}/release`),
      {
        json: true,
        headers: {'PRIVATE-TOKEN': gitlabToken},
        body: {tag_name: gitTag, ref: gitHead, release_description: notes}, // eslint-disable-line camelcase
      }
    );
  }

  logger.log('Published GitLab release: %s', gitTag);
};
