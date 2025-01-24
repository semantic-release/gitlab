import test from "ava";
import urlJoin from "url-join";
import { HttpProxyAgent, HttpsProxyAgent } from "hpagent";
import resolveConfig from "../lib/resolve-config.js";

const defaultOptions = {
  gitlabToken: undefined,
  gitlabUrl: "https://gitlab.com",
  gitlabApiUrl: urlJoin("https://gitlab.com", "/api/v4"),
  assets: undefined,
  milestones: undefined,
  releasedAt: undefined,
  successComment: undefined,
  successCommentCondition: undefined,
  failTitle: "The automated release is failing 🚨",
  failComment: undefined,
  failCommentCondition: undefined,
  labels: "semantic-release",
  assignee: undefined,
  proxy: {},
  retryLimit: 3,
};

test("Returns user config", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  const postComments = true;
  const proxy = {};
  const labels = false;
  const retryLimit = 42;

  t.deepEqual(
    resolveConfig(
      { gitlabUrl, gitlabApiPathPrefix, assets, postComments, labels, retryLimit },
      { env: { GITLAB_TOKEN: gitlabToken } }
    ),
    {
      ...defaultOptions,
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      labels: false,
      retryLimit,
    }
  );

  t.deepEqual(
    resolveConfig({ gitlabUrl, gitlabApiPathPrefix, assets, proxy }, { env: { GITLAB_TOKEN: gitlabToken } }),
    {
      ...defaultOptions,
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      proxy,
    }
  );
});

test("Returns user config via environment variables", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  const milestones = ["1.2.3"];

  t.deepEqual(
    resolveConfig(
      { assets, milestones },
      { env: { GITLAB_TOKEN: gitlabToken, GITLAB_URL: gitlabUrl, GITLAB_PREFIX: gitlabApiPathPrefix } }
    ),
    {
      ...defaultOptions,
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      milestones,
    }
  );
});

test("Returns user config via alternative environment variables", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];

  t.deepEqual(
    resolveConfig({ assets }, { env: { GL_TOKEN: gitlabToken, GL_URL: gitlabUrl, GL_PREFIX: gitlabApiPathPrefix } }),
    {
      ...defaultOptions,
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      milestones: undefined,
      releasedAt: undefined,
      successComment: undefined,
    }
  );
});

test("Returns user config via alternative environment variables with https proxy and no proto scheme set", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  // Testing with 8080 port because HttpsProxyAgent ignores 80 port with http protocol
  const proxyUrl = "http://proxy.test:8443";

  const result = resolveConfig(
    { assets },
    {
      env: {
        GL_TOKEN: gitlabToken,
        GL_URL: gitlabUrl,
        GL_PREFIX: gitlabApiPathPrefix,
        HTTPS_PROXY: proxyUrl,
      },
    }
  );

  t.deepEqual(result.proxy, {});
});

test("Returns user config via alternative environment variables with http proxy and no proto scheme set", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  // Testing with 8080 port because HttpsProxyAgent ignores 80 port with http protocol
  const proxyUrl = "http://proxy.test:8080";

  const result = resolveConfig(
    { assets },
    {
      env: {
        GL_TOKEN: gitlabToken,
        GL_URL: gitlabUrl,
        GL_PREFIX: gitlabApiPathPrefix,
        HTTP_PROXY: proxyUrl,
      },
    }
  );

  t.deepEqual(result.proxy, {});
});

test("Returns user config via alternative environment variables with http proxy", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "http://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  // Testing with 8080 port because HttpsProxyAgent ignores 80 port with http protocol
  const proxyUrl = "http://proxy.test:8080";

  const result = resolveConfig(
    { assets },
    {
      env: {
        GL_TOKEN: gitlabToken,
        GL_URL: gitlabUrl,
        GL_PREFIX: gitlabApiPathPrefix,
        HTTP_PROXY: proxyUrl,
      },
    }
  );

  t.assert(result.proxy.agent.http instanceof HttpProxyAgent);
  t.assert(result.proxy.agent.http.proxy.origin === proxyUrl);
});

test("Returns user config via alternative environment variables with https proxy", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  // Testing with 8443 port because HttpsProxyAgent ignores 443 port with https protocol
  const proxyUrl = "http://proxy.test:8443";

  const result = resolveConfig(
    { assets },
    {
      env: {
        GL_TOKEN: gitlabToken,
        GL_URL: gitlabUrl,
        GL_PREFIX: gitlabApiPathPrefix,
        HTTPS_PROXY: proxyUrl,
      },
    }
  );

  t.assert(result.proxy.agent.https instanceof HttpsProxyAgent);
  t.assert(result.proxy.agent.https.proxy.origin === proxyUrl);
});

test("Returns user config via alternative environment variables with mismatching http/https values for proxy gitlab url", (t) => {
  const gitlabToken = "TOKEN";
  const httpGitlabUrl = "http://host.com";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  // Testing with 8443 port because HttpsProxyAgent ignores 443 port with https protocol

  // HTTP GitLab URL and HTTPS_PROXY set
  t.deepEqual(
    resolveConfig(
      { assets },
      {
        env: {
          GL_TOKEN: gitlabToken,
          GL_URL: httpGitlabUrl,
          GL_PREFIX: gitlabApiPathPrefix,
          HTTPS_PROXY: "https://proxy.test:8443",
        },
      }
    ),
    {
      ...defaultOptions,
      gitlabToken: "TOKEN",
      gitlabUrl: "http://host.com",
      gitlabApiUrl: "http://host.com/api/prefix",
      assets: ["file.js"],
    }
  );

  // HTTPS GitLab URL and HTTP_PROXY set
  t.deepEqual(
    resolveConfig(
      { assets },
      {
        env: {
          GL_TOKEN: gitlabToken,
          GL_URL: gitlabUrl,
          GL_PREFIX: gitlabApiPathPrefix,
          HTTP_PROXY: "http://proxy.test:8443",
        },
      }
    ),
    {
      ...defaultOptions,
      gitlabToken: "TOKEN",
      gitlabUrl: "https://host.com",
      gitlabApiUrl: "https://host.com/api/prefix",
      assets: ["file.js"],
    }
  );
});
test("Returns user config via environment variables with HTTP_PROXY and NO_PROXY set", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "http://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  // Testing with 8080 port because HttpsProxyAgent ignores 80 port with http protocol
  const proxyUrl = "http://proxy.test:8080";

  const result = resolveConfig(
    { assets },
    {
      env: {
        GL_TOKEN: gitlabToken,
        GL_URL: gitlabUrl,
        GL_PREFIX: gitlabApiPathPrefix,
        HTTP_PROXY: proxyUrl,
        NO_PROXY: "*.host.com, host.com",
      },
    }
  );

  t.deepEqual(result.proxy, {});
});

test("Returns user config via environment variables with HTTPS_PROXY and NO_PROXY set", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  // Testing with 8080 port because HttpsProxyAgent ignores 80 port with http protocol
  const proxyUrl = "http://proxy.test:8080";

  const result = resolveConfig(
    { assets },
    {
      env: {
        GL_TOKEN: gitlabToken,
        GL_URL: gitlabUrl,
        GL_PREFIX: gitlabApiPathPrefix,
        HTTPS_PROXY: proxyUrl,
        NO_PROXY: "*.host.com, host.com",
      },
    }
  );
  t.deepEqual(result.proxy, {});
});

test("Returns user config via environment variables with HTTPS_PROXY and non-matching NO_PROXY set", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  // Testing with 8443 port because HttpsProxyAgent ignores 443 port with http protocol
  const proxyUrl = "https://proxy.test:8443";
  process.env.HTTPS_PROXY = proxyUrl;
  process.env.NO_PROXY = "*.differenthost.com, differenthost.com";

  const result = resolveConfig(
    { assets },
    {
      env: {
        GL_TOKEN: gitlabToken,
        GL_URL: gitlabUrl,
        GL_PREFIX: gitlabApiPathPrefix,
        HTTPS_PROXY: proxyUrl,
        NO_PROXY: "*.differenthost.com, differenthost.com",
      },
    }
  );
  t.assert(result.proxy.agent.https instanceof HttpsProxyAgent);
});

test("Returns user config via environment variables with HTTP_PROXY and non-matching NO_PROXY set", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "http://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  // Testing with 8080 port because HttpsProxyAgent ignores 80 port with http protocol
  const proxyUrl = "http://proxy.test:8080";

  const result = resolveConfig(
    { assets },
    {
      env: {
        GL_TOKEN: gitlabToken,
        GL_URL: gitlabUrl,
        GL_PREFIX: gitlabApiPathPrefix,
        HTTP_PROXY: proxyUrl,
        NO_PROXY: "*.differenthost.com, differenthost.com",
      },
    }
  );
  t.assert(result.proxy.agent.http instanceof HttpProxyAgent);
});

test("Returns default config", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabApiPathPrefix = "/api/prefix";
  const gitlabUrl = "https://gitlab.com";

  t.deepEqual(resolveConfig({}, { env: { GL_TOKEN: gitlabToken } }), {
    ...defaultOptions,
    gitlabToken,
  });

  t.deepEqual(resolveConfig({ gitlabApiPathPrefix }, { env: { GL_TOKEN: gitlabToken } }), {
    ...defaultOptions,
    gitlabToken,
    gitlabApiUrl: urlJoin("https://gitlab.com", gitlabApiPathPrefix),
  });

  t.deepEqual(resolveConfig({ gitlabUrl }, { env: { GL_TOKEN: gitlabToken } }), {
    ...defaultOptions,
    gitlabToken,
    gitlabUrl: "https://gitlab.com",
    gitlabApiUrl: urlJoin(gitlabUrl, "/api/v4"),
  });
});

test("Returns default config via GitLab CI/CD environment variables", (t) => {
  const gitlabToken = "TOKEN";
  const CI_PROJECT_URL = "http://ci-host.com/ci-owner/ci-repo";
  const CI_PROJECT_PATH = "ci-owner/ci-repo";
  const CI_API_V4_URL = "http://ci-host-api.com/prefix";

  t.deepEqual(
    resolveConfig(
      {},
      {
        envCi: { service: "gitlab" },
        env: { GL_TOKEN: gitlabToken, CI_PROJECT_URL, CI_PROJECT_PATH, CI_API_V4_URL },
      }
    ),
    {
      ...defaultOptions,
      gitlabToken,
      gitlabUrl: "http://ci-host.com",
      gitlabApiUrl: CI_API_V4_URL,
    }
  );
});

test("Returns user config over GitLab CI/CD environment variables", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  const failTitle = "The automated release unfortunately failed!";
  const labels = "bot,release-failed";
  const CI_PROJECT_URL = "http://ci-host.com/ci-owner/ci-repo";
  const CI_PROJECT_PATH = "ci-owner/ci-repo";
  const CI_API_V4_URL = "http://ci-host-api.com/prefix";

  t.deepEqual(
    resolveConfig(
      { gitlabUrl, gitlabApiPathPrefix, assets, failTitle, labels },
      {
        envCi: { service: "gitlab" },
        env: { GL_TOKEN: gitlabToken, CI_PROJECT_URL, CI_PROJECT_PATH, CI_API_V4_URL },
      }
    ),
    {
      ...defaultOptions,
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      failTitle: "The automated release unfortunately failed!",
      labels: "bot,release-failed",
    }
  );
});

test("Returns user config via environment variables over GitLab CI/CD environment variables", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const CI_PROJECT_URL = "http://ci-host.com/ci-owner/ci-repo";
  const CI_PROJECT_PATH = "ci-owner/ci-repo";
  const CI_API_V4_URL = "http://ci-host-api.com/prefix";

  t.deepEqual(
    resolveConfig(
      {},
      {
        envCi: { service: "gitlab" },
        env: {
          GITLAB_TOKEN: gitlabToken,
          GITLAB_URL: gitlabUrl,
          GITLAB_PREFIX: gitlabApiPathPrefix,
          CI_PROJECT_URL,
          CI_PROJECT_PATH,
          CI_API_V4_URL,
        },
      }
    ),
    {
      ...defaultOptions,
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
    }
  );
});

test("Returns user config via alternative environment variables over GitLab CI/CD environment variables", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const CI_PROJECT_URL = "http://ci-host.com/ci-owner/ci-repo";
  const CI_PROJECT_PATH = "ci-owner/ci-repo";
  const CI_API_V4_URL = "http://ci-host-api.com/prefix";

  t.deepEqual(
    resolveConfig(
      {},
      {
        envCi: { service: "gitlab" },
        env: {
          GL_TOKEN: gitlabToken,
          GL_URL: gitlabUrl,
          GL_PREFIX: gitlabApiPathPrefix,
          CI_PROJECT_URL,
          CI_PROJECT_PATH,
          CI_API_V4_URL,
        },
      }
    ),
    {
      ...defaultOptions,
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
    }
  );
});

test("Ignore GitLab CI/CD environment variables if not running on GitLab CI/CD", (t) => {
  const gitlabToken = "TOKEN";
  const CI_PROJECT_URL = "http://ci-host.com/owner/repo";
  const CI_PROJECT_PATH = "ci-owner/ci-repo";
  const CI_API_V4_URL = "http://ci-host-api.com/prefix";

  t.deepEqual(
    resolveConfig(
      {},
      {
        envCi: { service: "travis" },
        env: { GL_TOKEN: gitlabToken, CI_PROJECT_URL, CI_PROJECT_PATH, CI_API_V4_URL },
      }
    ),
    {
      ...defaultOptions,
      gitlabToken,
      gitlabUrl: "https://gitlab.com",
      gitlabApiUrl: urlJoin("https://gitlab.com", "/api/v4"),
    }
  );
});
