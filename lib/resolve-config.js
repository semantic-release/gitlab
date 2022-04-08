const {castArray, isNil} = require('lodash');
const urlJoin = require('url-join');
const {HttpProxyAgent, HttpsProxyAgent} = require('hpagent');

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
      HTTP_PROXY,
      HTTPS_PROXY,
      NO_PROXY,
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
    proxy: getProxyConfiguration(defaultedGitlabUrl, HTTP_PROXY, HTTPS_PROXY, NO_PROXY),
  };
};
 
function bypassProxy(NO_PROXY, gitlabUrl) {
  if (NO_PROXY === '*') {
    return true;
  }
  const hostName = gitlabUrl.split('://')[1].split(':')[0];
  const noProxyEntries = NO_PROXY.split(',');
  return noProxyEntries.some((proxyConfig) => {
    return hostName.endsWith(proxyConfig.toLowerCase().trim().replace(/^\./, ""));
  });
}
function getProxyConfiguration(gitlabUrl, HTTP_PROXY, HTTPS_PROXY, NO_PROXY) {
  const sharedParameters = {
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 256,
    maxFreeSockets: 256,
    scheduling: 'lifo',
  };
  if(bypassProxy(NO_PROXY, gitlabUrl)) {
    return {};
  }

  if (HTTP_PROXY && gitlabUrl.startsWith('http://')) {
    return {
      agent: {
        http: new HttpProxyAgent({
          ...sharedParameters,
          proxy: HTTP_PROXY,
        }),
      },
    };
  }

  if (HTTPS_PROXY && gitlabUrl.startsWith('https://')) {
    return {
      agent: {
        https: new HttpsProxyAgent({
          ...sharedParameters,
          proxy: HTTPS_PROXY,
        }),
      },
    };
  }

  return {};
}
