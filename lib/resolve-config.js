const {castArray, isNil} = require('lodash');
const urlJoin = require('url-join');
const {HttpProxyAgent, HttpsProxyAgent} = require('hpagent');
const {getProxyForUrl} = require('proxy-from-env');

module.exports = (
  {gitlabUrl, gitlabApiPathPrefix, assets, milestones, successComment},
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
    successComment,
    proxy: getProxyConfiguration(defaultedGitlabUrl),
  };
};

function getProxyConfiguration(gitlabUrl) {
  const sharedParameters = {
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 256,
    maxFreeSockets: 256,
    scheduling: 'lifo',
  };
  const proxy = getProxyForUrl(gitlabUrl);
  if (proxy) {
    if (gitlabUrl.startsWith('http://')) {
      return {
        agent: {
          http: new HttpProxyAgent({
            ...sharedParameters,
            proxy,
          }),
        },
      };
    }

    if (gitlabUrl.startsWith('https://')) {
      return {
        agent: {
          https: new HttpsProxyAgent({
            ...sharedParameters,
            proxy,
          }),
        },
      };
    }
  }

  return {};
}
