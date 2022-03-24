const test = require('ava');
const urlJoin = require('url-join');
const {HttpProxyAgent, HttpsProxyAgent} = require('hpagent');
const resolveConfig = require('../lib/resolve-config');

test('Returns user config', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
  const postComments = true;
  const proxy = {};
  const labels = false;

  t.deepEqual(
    resolveConfig({gitlabUrl, gitlabApiPathPrefix, assets, postComments, labels}, {env: {GITLAB_TOKEN: gitlabToken}}),
    {
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      milestones: undefined,
      proxy,
      successComment: undefined,
      failTitle: 'The automated release is failing 🚨',
      failComment: undefined,
      labels: false,
      assignee: undefined,
    }
  );

  t.deepEqual(resolveConfig({gitlabUrl, gitlabApiPathPrefix, assets, proxy}, {env: {GITLAB_TOKEN: gitlabToken}}), {
    gitlabToken,
    gitlabUrl,
    gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
    assets,
    milestones: undefined,
    proxy,
    successComment: undefined,
  });
});

test('Returns user config via environment variables', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
  const milestones = ['1.2.3'];
  const proxy = {};

  t.deepEqual(
    resolveConfig(
      {assets, milestones},
      {env: {GITLAB_TOKEN: gitlabToken, GITLAB_URL: gitlabUrl, GITLAB_PREFIX: gitlabApiPathPrefix}}
    ),
    {
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      milestones,
      successComment: undefined,
      proxy,
      failTitle: 'The automated release is failing 🚨',
      failComment: undefined,
      labels: 'semantic-release',
      assignee: undefined,
    }
  );
});

test('Returns user config via alternative environment variables', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
  const proxy = {};

  t.deepEqual(
    resolveConfig({assets}, {env: {GL_TOKEN: gitlabToken, GL_URL: gitlabUrl, GL_PREFIX: gitlabApiPathPrefix}}),
    {
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      milestones: undefined,
      successComment: undefined,
      proxy,
      failTitle: 'The automated release is failing 🚨',
      failComment: undefined,
      labels: 'semantic-release',
      assignee: undefined,
    }
  );
});

test('Returns user config via alternative environment variables with http proxy', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'http://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
  // Testing with 8080 port because HttpsProxyAgent ignores 80 port with http protocol
  const proxyUrl = 'http://proxy.test:8080';

  const result = resolveConfig(
    {assets},
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

test('Returns user config via alternative environment variables with https proxy', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
  // Testing with 8443 port because HttpsProxyAgent ignores 443 port with https protocol
  const proxyUrl = 'https://proxy.test:8443';

  const result = resolveConfig(
    {assets},
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

test('Returns user config via alternative environment variables with mismatching http/https values for proxy gitlab url', t => {
  const gitlabToken = 'TOKEN';
  const httpGitlabUrl = 'http://host.com';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
  // Testing with 8443 port because HttpsProxyAgent ignores 443 port with https protocol
  const httpProxyUrl = 'http://proxy.test:8443';
  const proxyUrl = 'https://proxy.test:8443';

  // HTTP GitLab URL and HTTPS_PROXY set
  t.deepEqual(
    resolveConfig(
      {assets},
      {
        env: {
          GL_TOKEN: gitlabToken,
          GL_URL: httpGitlabUrl,
          GL_PREFIX: gitlabApiPathPrefix,
          HTTPS_PROXY: proxyUrl,
        },
      }
    ),
    {
      gitlabToken: 'TOKEN',
      gitlabUrl: 'http://host.com',
      gitlabApiUrl: 'http://host.com/api/prefix',
      assets: ['file.js'],
      milestones: undefined,
      successComment: undefined,
      proxy: {},
      failTitle: 'The automated release is failing 🚨',
      failComment: undefined,
      labels: 'semantic-release',
      assignee: undefined,
    }
  );

  // HTTPS GitLab URL and HTTP_PROXY set
  t.deepEqual(
    resolveConfig(
      {assets},
      {
        env: {
          GL_TOKEN: gitlabToken,
          GL_URL: gitlabUrl,
          GL_PREFIX: gitlabApiPathPrefix,
          HTTP_PROXY: httpProxyUrl,
        },
      }
    ),
    {
      gitlabToken: 'TOKEN',
      gitlabUrl: 'https://host.com',
      gitlabApiUrl: 'https://host.com/api/prefix',
      assets: ['file.js'],
      milestones: undefined,
      successComment: undefined,
      proxy: {},
      failTitle: 'The automated release is failing 🚨',
      failComment: undefined,
      labels: 'semantic-release',
      assignee: undefined,
    }
  );
});

test('Returns default config', t => {
  const gitlabToken = 'TOKEN';
  const gitlabApiPathPrefix = '/api/prefix';
  const gitlabUrl = 'https://gitlab.com';

  t.deepEqual(resolveConfig({}, {env: {GL_TOKEN: gitlabToken}}), {
    gitlabToken,
    gitlabUrl: 'https://gitlab.com',
    gitlabApiUrl: urlJoin('https://gitlab.com', '/api/v4'),
    assets: undefined,
    milestones: undefined,
    successComment: undefined,
    proxy: {},
    failTitle: 'The automated release is failing 🚨',
    failComment: undefined,
    labels: 'semantic-release',
    assignee: undefined,
  });

  t.deepEqual(resolveConfig({gitlabApiPathPrefix}, {env: {GL_TOKEN: gitlabToken}}), {
    gitlabToken,
    gitlabUrl: 'https://gitlab.com',
    gitlabApiUrl: urlJoin('https://gitlab.com', gitlabApiPathPrefix),
    assets: undefined,
    milestones: undefined,
    successComment: undefined,
    proxy: {},
    failTitle: 'The automated release is failing 🚨',
    failComment: undefined,
    labels: 'semantic-release',
    assignee: undefined,
  });

  t.deepEqual(resolveConfig({gitlabUrl}, {env: {GL_TOKEN: gitlabToken}}), {
    gitlabToken,
    gitlabUrl: 'https://gitlab.com',
    gitlabApiUrl: urlJoin(gitlabUrl, '/api/v4'),
    assets: undefined,
    milestones: undefined,
    successComment: undefined,
    proxy: {},
    failTitle: 'The automated release is failing 🚨',
    failComment: undefined,
    labels: 'semantic-release',
    assignee: undefined,
  });
});

test('Returns default config via GitLab CI/CD environment variables', t => {
  const gitlabToken = 'TOKEN';
  const CI_PROJECT_URL = 'http://ci-host.com/ci-owner/ci-repo';
  const CI_PROJECT_PATH = 'ci-owner/ci-repo';
  const CI_API_V4_URL = 'http://ci-host-api.com/prefix';

  t.deepEqual(
    resolveConfig(
      {},
      {
        envCi: {service: 'gitlab'},
        env: {GL_TOKEN: gitlabToken, CI_PROJECT_URL, CI_PROJECT_PATH, CI_API_V4_URL},
      }
    ),
    {
      gitlabToken,
      gitlabUrl: 'http://ci-host.com',
      gitlabApiUrl: CI_API_V4_URL,
      assets: undefined,
      milestones: undefined,
      successComment: undefined,
      proxy: {},
      failTitle: 'The automated release is failing 🚨',
      failComment: undefined,
      labels: 'semantic-release',
      assignee: undefined,
    }
  );
});

test('Returns user config over GitLab CI/CD environment variables', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
  const failTitle = 'The automated release unfortunately failed!';
  const labels = 'bot,release-failed';
  const CI_PROJECT_URL = 'http://ci-host.com/ci-owner/ci-repo';
  const CI_PROJECT_PATH = 'ci-owner/ci-repo';
  const CI_API_V4_URL = 'http://ci-host-api.com/prefix';

  t.deepEqual(
    resolveConfig(
      {gitlabUrl, gitlabApiPathPrefix, assets, failTitle, labels},
      {
        envCi: {service: 'gitlab'},
        env: {GL_TOKEN: gitlabToken, CI_PROJECT_URL, CI_PROJECT_PATH, CI_API_V4_URL},
      }
    ),
    {
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      milestones: undefined,
      successComment: undefined,
      proxy: {},
      failTitle: 'The automated release unfortunately failed!',
      failComment: undefined,
      labels: 'bot,release-failed',
      assignee: undefined,
    }
  );
});

test('Returns user config via environment variables over GitLab CI/CD environment variables', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const CI_PROJECT_URL = 'http://ci-host.com/ci-owner/ci-repo';
  const CI_PROJECT_PATH = 'ci-owner/ci-repo';
  const CI_API_V4_URL = 'http://ci-host-api.com/prefix';

  t.deepEqual(
    resolveConfig(
      {},
      {
        envCi: {service: 'gitlab'},
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
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets: undefined,
      milestones: undefined,
      successComment: undefined,
      proxy: {},
      failTitle: 'The automated release is failing 🚨',
      failComment: undefined,
      labels: 'semantic-release',
      assignee: undefined,
    }
  );
});

test('Returns user config via alternative environment variables over GitLab CI/CD environment variables', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const CI_PROJECT_URL = 'http://ci-host.com/ci-owner/ci-repo';
  const CI_PROJECT_PATH = 'ci-owner/ci-repo';
  const CI_API_V4_URL = 'http://ci-host-api.com/prefix';

  t.deepEqual(
    resolveConfig(
      {},
      {
        envCi: {service: 'gitlab'},
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
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets: undefined,
      milestones: undefined,
      successComment: undefined,
      proxy: {},
      failTitle: 'The automated release is failing 🚨',
      failComment: undefined,
      labels: 'semantic-release',
      assignee: undefined,
    }
  );
});

test('Ignore GitLab CI/CD environment variables if not running on GitLab CI/CD', t => {
  const gitlabToken = 'TOKEN';
  const CI_PROJECT_URL = 'http://ci-host.com/owner/repo';
  const CI_PROJECT_PATH = 'ci-owner/ci-repo';
  const CI_API_V4_URL = 'http://ci-host-api.com/prefix';

  t.deepEqual(
    resolveConfig(
      {},
      {
        envCi: {service: 'travis'},
        env: {GL_TOKEN: gitlabToken, CI_PROJECT_URL, CI_PROJECT_PATH, CI_API_V4_URL},
      }
    ),
    {
      gitlabToken,
      gitlabUrl: 'https://gitlab.com',
      gitlabApiUrl: urlJoin('https://gitlab.com', '/api/v4'),
      assets: undefined,
      milestones: undefined,
      successComment: undefined,
      proxy: {},
      failTitle: 'The automated release is failing 🚨',
      failComment: undefined,
      labels: 'semantic-release',
      assignee: undefined,
    }
  );
});
