const test = require('ava');
const urlJoin = require('url-join');
const resolveConfig = require('../lib/resolve-config');
const HttpProxyAgent = require('http-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');

test('Returns user config', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];

  t.deepEqual(resolveConfig({gitlabUrl, gitlabApiPathPrefix, assets}, {env: {GITLAB_TOKEN: gitlabToken}}), {
    gitlabToken,
    gitlabUrl,
    gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
    assets,
    milestones: undefined,
    proxy: null,
  });
});

test('Returns user config via environment variables', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
  const milestones = ['1.2.3'];

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
      proxy: null,
    }
  );
});

test('Returns user config via alternative environment variables', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];

  t.deepEqual(
    resolveConfig({assets}, {env: {GL_TOKEN: gitlabToken, GL_URL: gitlabUrl, GL_PREFIX: gitlabApiPathPrefix}}),
    {
      gitlabToken,
      gitlabUrl,
      gitlabApiUrl: urlJoin(gitlabUrl, gitlabApiPathPrefix),
      assets,
      milestones: undefined,
      proxy: null,
    }
  );
});

test('Returns user config via alternative environment variables with http proxy', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'http://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
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

  t.assert(result.proxy instanceof HttpProxyAgent);
  t.like(result.proxy.proxy, {
    protocol: 'http:',
    host: 'proxy.test',
    port: 8080,
    hostname: 'proxy.test',
    href: 'http://proxy.test:8080/',
  });
});

test('Returns user config via alternative environment variables with https proxy', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
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

  t.assert(result.proxy instanceof HttpsProxyAgent);
  t.like(result.proxy.proxy, {
    protocol: 'https:',
    host: 'proxy.test',
    port: 8443,
    hostname: 'proxy.test',
    href: 'https://proxy.test:8443/',
  });
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
    proxy: null,
  });

  t.deepEqual(resolveConfig({gitlabApiPathPrefix}, {env: {GL_TOKEN: gitlabToken}}), {
    gitlabToken,
    gitlabUrl: 'https://gitlab.com',
    gitlabApiUrl: urlJoin('https://gitlab.com', gitlabApiPathPrefix),
    assets: undefined,
    milestones: undefined,
    proxy: null,
  });

  t.deepEqual(resolveConfig({gitlabUrl}, {env: {GL_TOKEN: gitlabToken}}), {
    gitlabToken,
    gitlabUrl: 'https://gitlab.com',
    gitlabApiUrl: urlJoin(gitlabUrl, '/api/v4'),
    assets: undefined,
    milestones: undefined,
    proxy: null,
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
      proxy: null,
    }
  );
});

test('Returns user config over GitLab CI/CD environment variables', t => {
  const gitlabToken = 'TOKEN';
  const gitlabUrl = 'https://host.com';
  const gitlabApiPathPrefix = '/api/prefix';
  const assets = ['file.js'];
  const CI_PROJECT_URL = 'http://ci-host.com/ci-owner/ci-repo';
  const CI_PROJECT_PATH = 'ci-owner/ci-repo';
  const CI_API_V4_URL = 'http://ci-host-api.com/prefix';

  t.deepEqual(
    resolveConfig(
      {gitlabUrl, gitlabApiPathPrefix, assets},
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
      proxy: null,
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
      proxy: null,
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
      proxy: null,
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
      proxy: null,
    }
  );
});
