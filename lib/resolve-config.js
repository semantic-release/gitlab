import { castArray, isNil } from "lodash-es";
import urlJoin from "url-join";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";

export default (
  {
    gitlabUrl,
    gitlabApiPathPrefix,
    assets,
    milestones,
    successComment,
    successCommentCondition,
    failTitle,
    failComment,
    failCommentCondition,
    labels,
    assignee,
    retryLimit,
    useJobToken,
  },
  {
    envCi: { service } = {},
    env: {
      CI_PROJECT_URL,
      CI_PROJECT_PATH,
      CI_API_V4_URL,
      CI_JOB_TOKEN,
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
  const DEFAULT_RETRY_LIMIT = 3;
  // Added 422 to fix #839
  // https://github.com/sindresorhus/got/blob/a359bd385129d2adbc765b52dfbbadac5f54a825/documentation/7-retry.md#retry
  const DEFAULT_RETRY_STATUS_CODES = [408, 413, 422, 429, 500, 502, 503, 504, 521, 522, 524];
  const userGitlabApiPathPrefix = isNil(gitlabApiPathPrefix)
    ? isNil(GL_PREFIX)
      ? GITLAB_PREFIX
      : GL_PREFIX
    : gitlabApiPathPrefix;
  const userGitlabUrl = gitlabUrl || GL_URL || GITLAB_URL;
  const defaultedGitlabUrl =
    userGitlabUrl ||
    (service === "gitlab" && CI_PROJECT_URL && CI_PROJECT_PATH
      ? CI_PROJECT_URL.replace(new RegExp(`/${CI_PROJECT_PATH}$`), "")
      : "https://gitlab.com");
  return {
    gitlabToken: useJobToken ? CI_JOB_TOKEN : GL_TOKEN || GITLAB_TOKEN,
    tokenHeader: useJobToken ? "JOB-TOKEN" : "PRIVATE-TOKEN",
    useJobToken,
    gitlabUrl: defaultedGitlabUrl,
    gitlabApiUrl:
      userGitlabUrl && userGitlabApiPathPrefix
        ? urlJoin(userGitlabUrl, userGitlabApiPathPrefix)
        : service === "gitlab" && CI_API_V4_URL
          ? CI_API_V4_URL
          : urlJoin(defaultedGitlabUrl, isNil(userGitlabApiPathPrefix) ? "/api/v4" : userGitlabApiPathPrefix),
    assets: assets ? castArray(assets) : assets,
    milestones: milestones ? castArray(milestones) : milestones,
    successComment,
    successCommentCondition: useJobToken ? false : successCommentCondition,
    proxy: getProxyConfiguration(defaultedGitlabUrl, HTTP_PROXY, HTTPS_PROXY, NO_PROXY),
    failTitle: isNil(failTitle) ? "The automated release is failing 🚨" : failTitle,
    failComment,
    failCommentCondition: useJobToken ? false : failCommentCondition,
    labels: isNil(labels) ? "semantic-release" : labels === false ? false : labels,
    assignee,
    retryLimit: retryLimit ?? DEFAULT_RETRY_LIMIT,
    retryStatusCodes: DEFAULT_RETRY_STATUS_CODES,
  };
};

// Copied from Rob Wu's great proxy-from-env library: https://github.com/Rob--W/proxy-from-env/blob/96d01f8fcfdccfb776735751132930bbf79c4a3a/index.js#L62
function shouldProxy(gitlabUrl, NO_PROXY) {
  const DEFAULT_PORTS = {
    ftp: 21,
    gopher: 70,
    http: 80,
    https: 443,
    ws: 80,
    wss: 443,
  };
  const parsedUrl =
    typeof gitlabUrl === "string" && (gitlabUrl.startsWith("http://") || gitlabUrl.startsWith("https://"))
      ? new URL(gitlabUrl)
      : gitlabUrl || {};
  let proto = parsedUrl.protocol;
  let hostname = parsedUrl.host;
  let { port } = parsedUrl;
  if (typeof hostname !== "string" || !hostname || typeof proto !== "string") {
    return ""; // Don't proxy URLs without a valid scheme or host.
  }

  proto = proto.split(":", 1)[0];
  // Stripping ports in this way instead of using parsedUrl.hostname to make
  // sure that the brackets around IPv6 addresses are kept.
  hostname = hostname.replace(/:\d*$/, "");
  port = Number.parseInt(port, 10) || DEFAULT_PORTS[proto] || 0;

  if (!NO_PROXY) {
    return true; // Always proxy if NO_PROXY is not set.
  }

  if (NO_PROXY === "*") {
    return false; // Never proxy if wildcard is set.
  }

  return NO_PROXY.split(/[,\s]/).every((proxy) => {
    if (!proxy) {
      return true; // Skip zero-length hosts.
    }

    const parsedProxy = proxy.match(/^(.+):(\d+)$/);
    let parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
    const parsedProxyPort = parsedProxy ? Number.parseInt(parsedProxy[2], 10) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
      return true; // Skip if ports don't match.
    }

    if (!/^[.*]/.test(parsedProxyHostname)) {
      // No wildcards, so stop proxying if there is an exact match.
      return hostname !== parsedProxyHostname;
    }

    if (parsedProxyHostname.charAt(0) === "*") {
      // Remove leading wildcard.
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }

    // Stop proxying if the hostname ends with the no_proxy host.
    return !hostname.endsWith(parsedProxyHostname);
  });
}

function getProxyConfiguration(gitlabUrl, HTTP_PROXY, HTTPS_PROXY, NO_PROXY) {
  const sharedParameters = {
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 256,
    maxFreeSockets: 256,
    scheduling: "lifo",
  };

  if (shouldProxy(gitlabUrl, NO_PROXY)) {
    if (HTTP_PROXY && gitlabUrl.startsWith("http://")) {
      return {
        agent: {
          http: new HttpProxyAgent({
            ...sharedParameters,
            proxy: HTTP_PROXY,
          }),
        },
      };
    }

    if (HTTPS_PROXY && gitlabUrl.startsWith("https://")) {
      return {
        agent: {
          https: new HttpsProxyAgent({
            ...sharedParameters,
            proxy: HTTPS_PROXY,
          }),
        },
      };
    }
  }

  return {};
}
