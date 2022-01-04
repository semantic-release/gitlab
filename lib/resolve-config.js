const {castArray, isNil} = require('lodash');
const urlJoin = require('url-join');
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');

module.exports = (
  {gitlabUrl, gitlabApiPathPrefix, assets, milestones},
  {
    envCi: {service} = {},
    env: {
      CI_PROJECT_URL,
      CI_PROJECT_PATH,
      CI_API_V4_URL,
      GL_TOKEN,
      GITLAB_TOKEN,
      GL_URL,
      GITLAB_URL,
      GL_PREFIX,
      GITLAB_PREFIX,
      HTTP_PROXY,
      HTTPS_PROXY,
    },
  }
) => {
  const userGitlabApiPathPrefix = isNil(gitlabApiPathPrefix)
    ? isNil(GL_PREFIX)
      ? GITLAB_PREFIX
      : GL_PREFIX
    : gitlabApiPathPrefix;
  const userGitlabUrl = gitlabUrl || GL_URL || GITLAB_URL;
  const defaultedGitlabUrl =
    userGitlabUrl ||
    (service === 'gitlab' && CI_PROJECT_URL && CI_PROJECT_PATH
      ? CI_PROJECT_URL.replace(new RegExp(`/${CI_PROJECT_PATH}$`), '')
      : 'https://gitlab.com');

  return {
    gitlabToken: GL_TOKEN || GITLAB_TOKEN,
    gitlabUrl: defaultedGitlabUrl,
    gitlabApiUrl:
      userGitlabUrl && userGitlabApiPathPrefix
        ? urlJoin(userGitlabUrl, userGitlabApiPathPrefix)
        : service === 'gitlab' && CI_API_V4_URL
        ? CI_API_V4_URL
        : urlJoin(defaultedGitlabUrl, isNil(userGitlabApiPathPrefix) ? '/api/v4' : userGitlabApiPathPrefix),
    assets: assets ? castArray(assets) : assets,
    milestones: milestones ? castArray(milestones) : milestones,
    proxy: getProxyConfiguration(defaultedGitlabUrl, HTTP_PROXY, HTTPS_PROXY),
  };
};

const getProxyConfiguration = (gitlabUrl, HTTP_PROXY, HTTPS_PROXY) => {
  const protocol = new URL(gitlabUrl).protocol.replace(':', '');

  if (HTTP_PROXY && protocol === 'http') {
    return new HttpProxyAgent(HTTP_PROXY);
  }

  if (HTTPS_PROXY && protocol === 'https') {
    return new HttpsProxyAgent(HTTPS_PROXY);
  }

  return null;
};
