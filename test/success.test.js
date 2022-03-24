const test = require('ava');
const nock = require('nock');
const {stub} = require('sinon');
const success = require('../lib/success');
const authenticate = require('./helpers/mock-gitlab');
const {RELEASE_NAME} = require('../lib/definitions/constants');

/* eslint camelcase: ["error", {properties: "never"}] */

test.beforeEach(t => {
  // Mock logger
  t.context.log = stub();
  t.context.error = stub();
  t.context.logger = {log: t.context.log, error: t.context.error};
});

test.afterEach.always(() => {
  // Clear nock
  nock.cleanAll();
});

test.serial('Post comments to related issues and MRs', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const pluginConfig = {};
  const nextRelease = {version: '1.0.0'};
  const releases = [{name: RELEASE_NAME, url: 'https://gitlab.com/test_user/test_repo/-/releases/v1.0.0'}];
  const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const commits = [{hash: 'abcdef'}, {hash: 'fedcba'}];
  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}/repository/commits/abcdef/merge_requests`)
    .reply(200, [
      {project_id: 100, iid: 1, state: 'merged'},
      {project_id: 200, iid: 2, state: 'closed'},
      {project_id: 300, iid: 3, state: 'merged'},
    ])
    .get(`/projects/${encodedRepoId}/repository/commits/fedcba/merge_requests`)
    .reply(200, [{project_id: 100, iid: 1, state: 'merged'}])
    .get(`/projects/100/merge_requests/1/closes_issues`)
    .reply(200, [
      {project_id: 100, iid: 11, state: 'closed'},
      {project_id: 100, iid: 12, state: 'open'},
      {project_id: 100, iid: 13, state: 'closed'},
    ])
    .get(`/projects/300/merge_requests/3/closes_issues`)
    .reply(200, [])
    .post(`/projects/100/merge_requests/1/notes`, {
      body:
        ':tada: This MR is included in version 1.0.0 :tada:\n\nThe release is available on [GitLab release](https://gitlab.com/test_user/test_repo/-/releases/v1.0.0)\nYour **[semantic-release](https://github.com/semantic-release/semantic-release)** bot :package: :rocket:',
    })
    .reply(200)
    .post(`/projects/300/merge_requests/3/notes`)
    .reply(200)
    .post(`/projects/100/issues/11/notes`, {
      body:
        ':tada: This issue has been resolved in version 1.0.0 :tada:\n\nThe release is available on [GitLab release](https://gitlab.com/test_user/test_repo/-/releases/v1.0.0)\nYour **[semantic-release](https://github.com/semantic-release/semantic-release)** bot :package: :rocket:',
    })
    .reply(200)
    .post(`/projects/100/issues/13/notes`)
    .reply(200);

  await success(pluginConfig, {env, options, nextRelease, logger: t.context.logger, commits, releases});

  t.true(gitlab.isDone());
});

test.serial('Post comments with custom template', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const pluginConfig = {
    successComment: `nextRelease: \${nextRelease.version} commits: \${commits.length} releases: \${releases.length} \${issue ? "issue" : "MR"} ID: \${issue ? issue.iid : mergeRequest.iid}`,
  };
  const nextRelease = {version: '1.0.0'};
  const releases = [{name: RELEASE_NAME, url: 'https://gitlab.com/test_user/test_repo/-/releases/v1.0.0'}];
  const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const commits = [{hash: 'abcdef'}];
  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}/repository/commits/abcdef/merge_requests`)
    .reply(200, [{project_id: 100, iid: 1, state: 'merged'}])
    .get(`/projects/100/merge_requests/1/closes_issues`)
    .reply(200, [{project_id: 100, iid: 11, state: 'closed'}])
    .post(`/projects/100/merge_requests/1/notes`, {
      body: 'nextRelease: 1.0.0 commits: 1 releases: 1 MR ID: 1',
    })
    .reply(200)
    .post(`/projects/100/issues/11/notes`, {
      body: 'nextRelease: 1.0.0 commits: 1 releases: 1 issue ID: 11',
    })
    .reply(200);

  await success(pluginConfig, {env, options, nextRelease, logger: t.context.logger, commits, releases});

  t.true(gitlab.isDone());
});

test.serial('Post comments for multiple releases', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const pluginConfig = {};
  const nextRelease = {version: '1.0.0'};
  const releases = [
    {name: RELEASE_NAME, url: 'https://gitlab.com/test_user/test_repo/-/releases/v1.0.0'},
    {name: 'Other release'},
  ];
  const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const commits = [{hash: 'abcdef'}];
  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}/repository/commits/abcdef/merge_requests`)
    .reply(200, [{project_id: 100, iid: 1, state: 'merged'}])
    .get(`/projects/100/merge_requests/1/closes_issues`)
    .reply(200, [])
    .post(`/projects/100/merge_requests/1/notes`, {
      body:
        ':tada: This MR is included in version 1.0.0 :tada:\n\nThe release is available on:\n- [GitLab release](https://gitlab.com/test_user/test_repo/-/releases/v1.0.0)\n- `Other release`\nYour **[semantic-release](https://github.com/semantic-release/semantic-release)** bot :package: :rocket:',
    })
    .reply(200);

  await success(pluginConfig, {env, options, nextRelease, logger: t.context.logger, commits, releases});

  t.true(gitlab.isDone());
});

test.serial('Does not post comments when successComment is set to false', async t => {
  const pluginConfig = {successComment: false};
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const nextRelease = {version: '1.0.0'};
  const releases = [{name: RELEASE_NAME, url: 'https://gitlab.com/test_user/test_repo/-/releases/v1.0.0'}];
  const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const commits = [{hash: 'abcdef'}, {hash: 'fedcba'}];
  const gitlab = authenticate(env);

  await success(pluginConfig, {env, options, nextRelease, logger: t.context.logger, commits, releases});

  t.true(gitlab.isDone());
});
