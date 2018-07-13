import test from 'ava';
import nock from 'nock';
import {stub} from 'sinon';
import publish from '../lib/publish';
import authenticate from './helpers/mock-gitlab';

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

test.serial('Publish a release', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const pluginConfig = {};
  const nextRelease = {gitHead: '123', gitTag: '@scope/v1.0.0', notes: 'Test release note body'};
  const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);

  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/repository/tags/${encodedGitTag}/release`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
    })
    .reply(200);

  const result = await publish(pluginConfig, {env, options, nextRelease, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlab.isDone());
});
