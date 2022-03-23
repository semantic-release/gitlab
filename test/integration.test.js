const test = require('ava');
const nock = require('nock');
const {stub} = require('sinon');
const clearModule = require('clear-module');
const authenticate = require('./helpers/mock-gitlab');

/* eslint camelcase: ["error", {properties: "never"}] */

test.beforeEach(t => {
  // Clear npm cache to refresh the module state
  clearModule('..');
  t.context.m = require('..');
  // Stub the logger
  t.context.log = stub();
  t.context.error = stub();
  t.context.logger = {log: t.context.log, error: t.context.error};
});

test.afterEach.always(() => {
  // Clear nock
  nock.cleanAll();
});

test.serial('Verify GitLab auth', async t => {
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const owner = 'test_user';
  const repo = 'test_repo';
  const options = {repositoryUrl: `git+https://othertesturl.com/${owner}/${repo}.git`};
  const github = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 30}}});

  await t.notThrowsAsync(t.context.m.verifyConditions({}, {env, options, logger: t.context.logger}));

  t.true(github.isDone());
});

test.serial('Throw SemanticReleaseError if invalid config', async t => {
  const env = {};
  const options = {
    publish: [{path: '@semantic-release/npm'}, {path: '@semantic-release/gitlab'}],
    repositoryUrl: 'git+ssh://git@gitlab.com/context.git',
  };

  const errors = [
    ...(await t.throwsAsync(
      t.context.m.verifyConditions({gitlabUrl: 'https://gitlab.com/context'}, {env, options, logger: t.context.logger})
    )),
  ];

  t.is(errors[0].name, 'SemanticReleaseError');
  t.is(errors[0].code, 'EINVALIDGITLABURL');
  t.is(errors[1].name, 'SemanticReleaseError');
  t.is(errors[1].code, 'ENOGLTOKEN');
});

test.serial('Publish a release', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const nextRelease = {gitHead: '123', gitTag: 'v1.0.0', notes: 'Test release note body'};
  const options = {branch: 'master', repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);

  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}`)
    .reply(200, {permissions: {project_access: {access_level: 30}}})
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [],
      },
    })
    .reply(200);

  const result = await t.context.m.publish({}, {env, nextRelease, options, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${nextRelease.gitTag}`);
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://gitlab.com/api/v4']);
  t.deepEqual(t.context.log.args[1], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial('Verify Github auth and release', async t => {
  const env = {GL_TOKEN: 'gitlab_token'};
  const owner = 'test_user';
  const repo = 'test_repo';
  const options = {repositoryUrl: `https://github.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const nextRelease = {gitHead: '123', gitTag: 'v1.0.0', notes: 'Test release note body'};

  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}`)
    .reply(200, {permissions: {project_access: {access_level: 30}}})
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [],
      },
    })
    .reply(200);

  await t.notThrowsAsync(t.context.m.verifyConditions({}, {env, options, logger: t.context.logger}));
  const result = await t.context.m.publish({}, {env, options, nextRelease, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${nextRelease.gitTag}`);
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://gitlab.com/api/v4']);
  t.deepEqual(t.context.log.args[1], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlab.isDone());
});
