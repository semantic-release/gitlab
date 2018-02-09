import test from 'ava';
import nock from 'nock';
import {stub} from 'sinon';
import publish from '../lib/publish';
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
  // Mock logger
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

test.serial('Publish a release', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  process.env.GITLAB_TOKEN = 'gitlab_token';
  const pluginConfig = {};
  const nextRelease = {gitHead: '123', gitTag: 'v1.0.0', notes: 'Test release note body'};
  const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};

  const gitlab = authenticate()
    .post(`/projects/${owner}%2F${repo}/repository/tags/${nextRelease.gitTag}/release`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
    })
    .reply(200);

  await publish(pluginConfig, options, nextRelease, t.context.logger);

  t.deepEqual(t.context.log.args[0], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlab.isDone());
});
