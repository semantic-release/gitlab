import nock from 'nock';
import urlJoin from 'url-join';

/**
 * Return a `nock` object setup to respond to a GitLab authentication request. Other expectation and responses can be chained.
 *
 * @param {Object} [env={}] Environment variables.
 * @param {Object} [options={}] Options.
 * @param {boolean} [options.useJobToken=false] Whether to use a CI_JOB_TOKEN.
 * @param {String} [options.gitlabToken=env.GL_TOKEN || env.GITLAB_TOKEN || 'GL_TOKEN'] The GitLab token to use for authentication.
 * @param {String} [options.gitlabUrl=env.GL_URL || env.GITLAB_URL || 'https://gitlab.com'] The url on which to intercept http requests.
 * @param {String} [options.gitlabApiPathPrefix=env.GL_PREFIX || env.GITLAB_PREFIX || '/api/v4'] The GitLab API prefix.
 * @return {Object} A `nock` object ready to respond to a GitLab authentication request.
 */
export default function (
  env = {},
  {
    useJobToken = false,
    gitlabToken = env.GL_TOKEN || env.GITLAB_TOKEN || 'GL_TOKEN',
    gitlabUrl = env.GL_URL || env.GITLAB_URL || 'https://gitlab.com',
    gitlabApiPathPrefix = typeof env.GL_PREFIX === 'string'
      ? env.GL_PREFIX
      : null || typeof env.GITLAB_PREFIX === 'string'
        ? env.GITLAB_PREFIX
        : null || '/api/v4',
  } = {}
) {
  const tokenHeader = useJobToken ? "JOB-TOKEN" : "Private-Token";
  const token = useJobToken ? env.CI_JOB_TOKEN : gitlabToken;

  return nock(urlJoin(gitlabUrl, gitlabApiPathPrefix), { reqheaders: { [tokenHeader]: token } });
}
