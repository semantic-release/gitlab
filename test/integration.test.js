import test from 'ava';
import nock from 'nock';
import {stub} from 'sinon';
import clearModule from 'clear-module';
import authenticate from './helpers/mock-gitlab';

/* eslint camelcase: ["error", {properties: "never"}] */

// Save the current process.env
const envBackup = Object.assign({}, process.env);

test.beforeEach(t => {
  // Delete env variables in case they are on the machine running the tests
  delete process.env.GL_TOKEN;
  delete process.env.GITLAB_TOKEN;
  delete process.env.GL_URL;
  delete process.env.GITLAB_URL;
  delete process.env.GL_PREFIX;
  delete process.env.GITLAB_PREFIX;
  // Clear npm cache to refresh the module state
  clearModule('..');
  t.context.m = require('..');
  // Stub the logger
  t.context.log = stub();
  t.context.error = stub();
  t.context.logger = {log: t.context.log, error: t.context.error};
});

test.afterEach.always(() => {
  // Restore process.env
  process.env = envBackup;
  // Clear nock
  nock.cleanAll();
});

test.serial('Verify GitLab auth', async t => {
  process.env.GITLAB_TOKEN = 'gitlab_token';
  const owner = 'test_user';
  const repo = 'test_repo';
  const options = {repositoryUrl: `git+https://othertesturl.com/${owner}/${repo}.git`};
  const github = authenticate()
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 30}}});

  await t.notThrows(t.context.m.verifyConditions({}, {options, logger: t.context.logger}));

  t.true(github.isDone());
});

test.serial('Throw SemanticReleaseError if invalid config', async t => {
  const options = {
    publish: [{path: '@semantic-release/npm'}, {path: '@semantic-release/gitlab'}],
    repositoryUrl: 'git+ssh://git@gitlab.com/context.git',
  };

  const errors = [
    ...(await t.throws(
      t.context.m.verifyConditions({gitlabUrl: 'https://gitlab.com/context'}, {options, logger: t.context.logger})
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
  process.env.GL_TOKEN = 'gitlab_token';
  const nextRelease = {gitHead: '123', gitTag: 'v1.0.0', notes: 'Test release note body'};
  const options = {branch: 'master', repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);

  const gitlab = authenticate()
    .get(`/projects/${encodedRepoId}`)
    .reply(200, {permissions: {project_access: {access_level: 30}}})
    .post(`/projects/${encodedRepoId}/repository/tags/${nextRelease.gitTag}/release`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
    })
    .reply(200);

  const result = await t.context.m.publish({}, {nextRelease, options, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${nextRelease.gitTag}`);
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://gitlab.com/api/v4']);
  t.deepEqual(t.context.log.args[1], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial('Verify Github auth and release', async t => {
  process.env.GL_TOKEN = 'gitlab_token';
  const owner = 'test_user';
  const repo = 'test_repo';
  const options = {repositoryUrl: `https://github.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const nextRelease = {gitHead: '123', gitTag: 'v1.0.0', notes: 'Test release note body'};

  const gitlab = authenticate()
    .get(`/projects/${encodedRepoId}`)
    .reply(200, {permissions: {project_access: {access_level: 30}}})
    .post(`/projects/${encodedRepoId}/repository/tags/${nextRelease.gitTag}/release`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
    })
    .reply(200);

  await t.notThrows(t.context.m.verifyConditions({}, {options, logger: t.context.logger}));
  const result = await t.context.m.publish({}, {nextRelease, options, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${nextRelease.gitTag}`);
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://gitlab.com/api/v4']);
  t.deepEqual(t.context.log.args[1], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlab.isDone());
});
