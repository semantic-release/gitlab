import nock from 'nock';
import urlJoin from 'url-join';

/**
 * Retun a `nock` object setup to respond to a GitLab authentication request. Other expectation and responses can be chained.
 *
 * @param {String} [gitlabToken=process.env.GL_TOKEN || process.env.GITLAB_TOKEN || 'GL_TOKEN'] The github token to return in the authentication response.
 * @param {String} [gitlabUrl=process.env.GL_URL || process.env.GITLAB_URL || 'https://api.github.com'] The url on which to intercept http requests.
 * @param {String} [gitlabApiPathPrefix=process.env.GL_PREFIX || process.env.GITLAB_PREFIX || ''] The GitHub Enterprise API prefix.
 * @return {Object} A `nock` object ready to respond to a github authentication request.
 */
export default function authenticate({
  gitlabToken = process.env.GL_TOKEN || process.env.GITLAB_TOKEN || 'GL_TOKEN',
  gitlabUrl = process.env.GL_URL || process.env.GITLAB_URL || 'https://gitlab.com',
  gitlabApiPathPrefix = typeof process.env.GL_PREFIX === 'string'
    ? process.env.GL_PREFIX
    : null || typeof process.env.GITLAB_PREFIX === 'string' ? process.env.GITLAB_PREFIX : null || '/api/v4',
} = {}) {
  return nock(urlJoin(gitlabUrl, gitlabApiPathPrefix), {reqheaders: {'Private-Token': gitlabToken}});
}
