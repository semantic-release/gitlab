import test from 'ava';
import nock from 'nock';
import tempy from 'tempy';
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

test.serial('Publish a release with assets', async t => {
  const cwd = 'test/fixtures/files';
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const nextRelease = {gitHead: '123', gitTag: '@scope/v1.0.0', notes: 'Test release note body'};
  const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = {url: '/uploads/file.css', alt: 'file.css'};
  const notes = `${nextRelease.notes}`;
  const assets = [['**', '!**/*.txt', '!.dotfile']];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/repository/tags/${encodedGitTag}/release`, {
      tag_name: nextRelease.gitTag,
      description: notes,
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedRepoId}/uploads`, /filename="file.css"/gm)
    .reply(200, uploaded);
  const gitlabAssetLink = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases/${encodedGitTag}/assets/links`, {
      url: `https://gitlab.com/${owner}/${repo}${uploaded.url}`,
      name: uploaded.alt,
    })
    .reply(200, {});

  const result = await publish({assets}, {env, cwd, options, nextRelease, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ['Uploaded file: %s', uploaded.url]);
  t.deepEqual(t.context.log.args[1], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
  t.true(gitlabAssetLink.isDone());
});

test.serial('Publish a release with array of missing assets', async t => {
  const cwd = 'test/fixtures/files';
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const nextRelease = {gitHead: '123', gitTag: '@scope/v1.0.0', notes: 'Test release note body'};
  const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const emptyDirectory = tempy.directory();
  const assets = [emptyDirectory, {path: 'missing.txt', label: 'missing.txt'}];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/repository/tags/${encodedGitTag}/release`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
    })
    .reply(200);
  const result = await publish({assets}, {env, cwd, options, nextRelease, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial('Publish a release with one asset and custom label', async t => {
  const cwd = 'test/fixtures/files';
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const nextRelease = {gitHead: '123', gitTag: '@scope/v1.0.0', notes: 'Test release note body'};
  const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = {url: '/uploads/upload.txt'};
  const assetLabel = 'Custom Label';
  const notes = `${nextRelease.notes}`;
  const assets = [{path: 'upload.txt', label: assetLabel}];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/repository/tags/${encodedGitTag}/release`, {
      tag_name: nextRelease.gitTag,
      description: notes,
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedRepoId}/uploads`, /filename="upload.txt"/gm)
    .reply(200, uploaded);
  const gitlabAssetLink = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases/${encodedGitTag}/assets/links`, {
      url: `https://gitlab.com/${owner}/${repo}${uploaded.url}`,
      name: assetLabel,
    })
    .reply(200, {});

  const result = await publish({assets}, {env, cwd, options, nextRelease, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ['Uploaded file: %s', uploaded.url]);
  t.deepEqual(t.context.log.args[1], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
  t.true(gitlabAssetLink.isDone());
});
