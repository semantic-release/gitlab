import test from 'ava';
import nock from 'nock';
import tempy from 'tempy';
import {stub} from 'sinon';
import publish from '../lib/publish';
import authenticate from './helpers/mock-gitlab';

/* eslint camelcase: ["error", {properties: "never"}] */

const owner = 'test_user';
const repo = 'test_repo';
const env = {GITLAB_TOKEN: 'gitlab_token'};
const pluginConfig = {};
const nextRelease = {gitHead: '123', gitTag: '@scope/v1.0.0', notes: 'Test release note body'};
const options = {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`};
const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
const releaseUrl = `/projects/${encodedRepoId}/repository/tags/${encodedGitTag}/release`;
const releaseBody = {
  tag_name: nextRelease.gitTag,
  description: nextRelease.notes,
};

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
  const gitlab = authenticate(env)
    .post(releaseUrl, releaseBody)
    .reply(200);

  const result = await publish(pluginConfig, {env, options, nextRelease, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial('Publish a release with assets', async t => {
  const cwd = 'test/fixtures/files';
  const uploaded = {markdown: '[file.css](/uploads/file.css)', url: '/uploads/file.css', alt: 'file.css'};
  const notes = `${nextRelease.notes}\n\n#### Assets\n\n* ${uploaded.markdown}`;
  const assets = [['**', '!**/*.txt', '!.dotfile']];
  const gitlab = authenticate(env)
    .post(releaseUrl, {...releaseBody, description: notes})
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedRepoId}/uploads`, body => {
      return body.match('filename="file.css"');
    })
    .reply(200, uploaded);

  const result = await publish({assets}, {env, cwd, options, nextRelease, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ['Uploaded file: %s', uploaded.url]);
  t.deepEqual(t.context.log.args[1], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial('Publish a release with array of missing assets', async t => {
  const cwd = 'test/fixtures/files';
  const emptyDirectory = tempy.directory();
  const assets = [emptyDirectory, {path: 'missing.txt', label: 'missing.txt'}];
  const gitlab = authenticate(env)
    .post(releaseUrl, {...releaseBody, description: nextRelease.notes})
    .reply(200);

  const result = await publish({assets}, {env, cwd, options, nextRelease, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial('Publish a release with one asset and custom label', async t => {
  const cwd = 'test/fixtures/files';
  const uploaded = {markdown: '[file](/uploads/upload.txt)', url: '/uploads/upload.txt'};
  const assetLabel = 'Custom Label';
  const notes = `${nextRelease.notes}\n\n#### Assets\n\n* [${assetLabel}](${uploaded.url})`;
  const assets = [{path: 'upload.txt', label: assetLabel}];
  const gitlab = authenticate(env)
    .post(releaseUrl, {...releaseBody, description: notes})
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedRepoId}/uploads`, body => {
      return body.match('filename="upload.txt"');
    })
    .reply(200, uploaded);

  const result = await publish({assets}, {env, cwd, options, nextRelease, logger: t.context.logger});

  t.is(result.url, `https://gitlab.com/${encodedRepoId}/tags/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ['Uploaded file: %s', uploaded.url]);
  t.deepEqual(t.context.log.args[1], ['Published GitLab release: %s', nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});
