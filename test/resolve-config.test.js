import test from "ava";
import urlJoin from "url-join";
import resolveConfig from "../lib/resolve-config.js";

const defaultOptions = {
  gitlabToken: undefined,
  gitlabUrl: "https://gitlab.com",
  gitlabApiUrl: urlJoin("https://gitlab.com", "/api/v4"),
  assets: undefined,
  milestones: undefined,
  successComment: undefined,
  successCommentCondition: undefined,
  failTitle: "The automated release is failing 🚨",
  failComment: undefined,
  failCommentCondition: undefined,
  labels: "semantic-release",
  assignee: undefined,
  retryLimit: 3,
};

test("Returns user config", (t) => {
  const gitlabToken = "TOKEN";
  const gitlabUrl = "https://host.com";
  const gitlabApiPathPrefix = "/api/prefix";
  const assets = ["file.js"];
  const postComments = true;
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

  t.deepEqual(resolveConfig({ gitlabUrl, gitlabApiPathPrefix, assets }, { env: { GITLAB_TOKEN: gitlabToken } }), {
    ...defaultOptions,
    gitlabToken,
    gitlabUrl,
    gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
    assets,
  });
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
      successComment: undefined,
    }
  );
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
