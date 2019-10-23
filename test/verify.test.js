import test from 'ava';
import nock from 'nock';
import {stub} from 'sinon';
import AggregateError from 'aggregate-error';
import {HTTPError} from 'got';
import verify from '../lib/verify';
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

test.serial('Verify token and repository access (project_access 30)', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 30}}});

  await t.notThrowsAsync(
    verify({}, {env, options: {repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git`}, logger: t.context.logger})
  );
  t.true(gitlab.isDone());
});

test.serial('Verify token and repository access (project_access 40)', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify({}, {env, options: {repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git`}, logger: t.context.logger})
  );
  t.true(gitlab.isDone());
});

test.serial('Verify token and repository access (group_access 30)', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 10}, group_access: {access_level: 30}}});

  await t.notThrowsAsync(
    verify({}, {env, options: {repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git`}, logger: t.context.logger})
  );
  t.true(gitlab.isDone());
});

test.serial('Verify token and repository access (group_access 40)', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 10}, group_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify({}, {env, options: {repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git`}, logger: t.context.logger})
  );
  t.true(gitlab.isDone());
});

test.serial('Verify token and repository access and custom URL with prefix', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlabUrl = 'https://othertesturl.com:9090';
  const gitlabApiPathPrefix = 'prefix';
  const gitlab = authenticate(env, {gitlabUrl, gitlabApiPathPrefix})
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {gitlabUrl, gitlabApiPathPrefix},
      {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://othertesturl.com:9090/prefix']);
});

test.serial('Verify token and repository access and custom URL without prefix', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlabUrl = 'https://othertesturl.com:9090';
  const gitlab = authenticate(env, {gitlabUrl})
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {gitlabUrl},
      {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://othertesturl.com:9090/api/v4']);
});

test.serial('Verify token and repository access with subgroup git URL', async t => {
  const repoUri = 'orga/subgroup/test_user/test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlabUrl = 'https://customurl.com:9090/context';
  const gitlabApiPathPrefix = 'prefix';
  const gitlab = authenticate(env, {gitlabUrl, gitlabApiPathPrefix})
    .get(`/projects/${encodeURIComponent(repoUri)}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {gitlabUrl, gitlabApiPathPrefix},
      {env, options: {repositoryUrl: `git@customurl.com:${repoUri}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    'Verify GitLab authentication (%s)',
    'https://customurl.com:9090/context/prefix',
  ]);
});

test.serial('Verify token and repository access with subgroup http URL', async t => {
  const repoUri = 'orga/subgroup/test_user/test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlabUrl = 'https://customurl.com:9090/context';
  const gitlabApiPathPrefix = 'prefix';
  const gitlab = authenticate(env, {gitlabUrl, gitlabApiPathPrefix})
    .get(`/projects/${encodeURIComponent(repoUri)}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {gitlabUrl, gitlabApiPathPrefix},
      {env, options: {repositoryUrl: `http://customurl.com/${repoUri}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    'Verify GitLab authentication (%s)',
    'https://customurl.com:9090/context/prefix',
  ]);
});

test.serial('Verify token and repository access with empty gitlabApiPathPrefix', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlabUrl = 'https://othertesturl.com:9090';
  const gitlabApiPathPrefix = '';
  const gitlab = authenticate(env, {gitlabUrl, gitlabApiPathPrefix})
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {gitlabUrl, gitlabApiPathPrefix},
      {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://othertesturl.com:9090']);
});

test.serial('Verify token and repository with environment variables', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_URL: 'https://othertesturl.com:443', GL_TOKEN: 'gitlab_token', GL_PREFIX: 'prefix'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify({}, {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger})
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ['Verify GitLab authentication (%s)', 'https://othertesturl.com:443/prefix']);
});

test.serial('Verify token and repository access with alternative environment varialbes', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_URL: 'https://othertesturl.com:443', GITLAB_TOKEN: 'gitlab_token', GITLAB_PREFIX: 'prefix'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify({}, {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger})
  );
  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is a String', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_URL: 'https://othertesturl.com:443', GITLAB_TOKEN: 'gitlab_token', GITLAB_PREFIX: 'prefix'};
  const assets = 'file2.js';
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {assets},
      {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is an Object with a path property', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_URL: 'https://othertesturl.com:443', GITLAB_TOKEN: 'gitlab_token', GITLAB_PREFIX: 'prefix'};
  const assets = {path: 'file2.js'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {assets},
      {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is an Array of Object with a path property', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_URL: 'https://othertesturl.com:443', GITLAB_TOKEN: 'gitlab_token', GITLAB_PREFIX: 'prefix'};
  const assets = [{path: 'file1.js'}, {path: 'file2.js'}];
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {assets},
      {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is an Array of glob Arrays', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_URL: 'https://othertesturl.com:443', GITLAB_TOKEN: 'gitlab_token', GITLAB_PREFIX: 'prefix'};
  const assets = [['dist/**', '!**/*.js'], 'file2.js'];
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {assets},
      {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is an Array of Object with a glob Arrays in path property', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_URL: 'https://othertesturl.com:443', GITLAB_TOKEN: 'gitlab_token', GITLAB_PREFIX: 'prefix'};
  const assets = [{path: ['dist/**', '!**/*.js']}, {path: 'file2.js'}];
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  await t.notThrowsAsync(
    verify(
      {assets},
      {env, options: {repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git`}, logger: t.context.logger}
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "assets" option is not a String or an Array of Objects', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const assets = 42;
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  const aggregateError = await t.throwsAsync(
    verify(
      {assets},
      {env, options: {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`}, logger: t.context.logger}
    ),
    AggregateError,
    'Error thrown but of unexpected type.'
  );
  const errors = [...aggregateError];

  const expectedNumOfErrors = 1;
  t.is(errors.length, expectedNumOfErrors, `Expected ${expectedNumOfErrors} error but got ${errors.length}.`);
  t.is(errors[0].name, 'SemanticReleaseError', 'Unexpected error name.');
  t.is(errors[0].code, 'EINVALIDASSETS', 'Unexpected error code.');
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "assets" option is an Array with invalid elements', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const assets = ['file.js', 42];
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  const aggregateError = await t.throwsAsync(
    verify(
      {assets},
      {env, options: {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`}, logger: t.context.logger}
    ),
    AggregateError,
    'Error thrown but of unexpected type.'
  );
  const errors = [...aggregateError];

  const expectedNumOfErrors = 1;
  t.is(errors.length, expectedNumOfErrors, `Expected ${expectedNumOfErrors} error but got ${errors.length}.`);
  t.is(errors[0].name, 'SemanticReleaseError', 'Unexpected error name.');
  t.is(errors[0].code, 'EINVALIDASSETS', 'Unexpected error code.');
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "assets" option is an Object missing the "path" property', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const assets = {name: 'file.js'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 40}}});

  const aggregateError = await t.throwsAsync(
    verify(
      {assets},
      {env, options: {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`}, logger: t.context.logger}
    ),
    AggregateError,
    'Error thrown but of unexpected type.'
  );
  const errors = [...aggregateError];

  const expectedNumOfErrors = 1;
  t.is(errors.length, expectedNumOfErrors, `Expected ${expectedNumOfErrors} error but got ${errors.length}.`);
  t.is(errors[0].name, 'SemanticReleaseError', 'Unexpected error name.');
  t.is(errors[0].code, 'EINVALIDASSETS', 'Unexpected error code.');
  t.true(gitlab.isDone());
});

test.serial(
  'Throw SemanticReleaseError if "assets" option is an Array with objects missing the "path" property',
  async t => {
    const owner = 'test_user';
    const repo = 'test_repo';
    const env = {GITLAB_TOKEN: 'gitlab_token'};
    const assets = [{path: 'lib/file.js'}, {name: 'file.js'}];
    const gitlab = authenticate(env)
      .get(`/projects/${owner}%2F${repo}`)
      .reply(200, {permissions: {project_access: {access_level: 40}}});

    const aggregateError = await t.throwsAsync(
      verify(
        {assets},
        {env, options: {repositoryUrl: `https://gitlab.com/${owner}/${repo}.git`}, logger: t.context.logger}
      ),
      AggregateError,
      'Error thrown but of unexpected type.'
    );
    const errors = [...aggregateError];

    const expectedNumOfErrors = 1;
    t.is(errors.length, expectedNumOfErrors, `Expected ${expectedNumOfErrors} error but got ${errors.length}.`);
    t.is(errors[0].name, 'SemanticReleaseError', 'Unexpected error name.');
    t.is(errors[0].code, 'EINVALIDASSETS', 'Unexpected error code.');
    t.true(gitlab.isDone());
  }
);

test.serial('Throw SemanticReleaseError for missing GitLab token', async t => {
  const env = {};
  const aggregateError = await t.throwsAsync(
    verify(
      {},
      {env, options: {repositoryUrl: 'https://gitlab.com/semantic-release/gitlab.git'}, logger: t.context.logger}
    ),
    AggregateError,
    'Error thrown but of unexpected type.'
  );
  const errors = [...aggregateError];

  const expectedNumOfErrors = 1;
  t.is(errors.length, expectedNumOfErrors, `Expected ${expectedNumOfErrors} error but got ${errors.length}.`);
  t.is(errors[0].name, 'SemanticReleaseError', 'Unexpected error name.');
  t.is(errors[0].code, 'ENOGLTOKEN', 'Unexpected error code.');
});

test.serial('Throw SemanticReleaseError for invalid token', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GL_TOKEN: 'gitlab_token'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(401);

  const aggregateError = await t.throwsAsync(
    verify({}, {env, options: {repositoryUrl: `https://gitlab.com:${owner}/${repo}.git`}, logger: t.context.logger}),
    AggregateError,
    'Error thrown but of unexpected type.'
  );
  const errors = [...aggregateError];

  const expectedNumOfErrors = 1;
  t.is(errors.length, expectedNumOfErrors, `Expected ${expectedNumOfErrors} error but got ${errors.length}.`);
  t.is(errors[0].name, 'SemanticReleaseError', 'Unexpected error name.');
  t.is(errors[0].code, 'EINVALIDGLTOKEN', 'Unexpected error code.');
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError for invalid repositoryUrl', async t => {
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const gitlabUrl = 'https://gitlab.com/context';

  const [error] = await t.throwsAsync(
    verify(
      {gitlabUrl},
      {env, options: {repositoryUrl: 'git+ssh://git@gitlab.com/context.git'}, logger: t.context.logger}
    )
  );

  t.is(error.name, 'SemanticReleaseError');
  t.is(error.code, 'EINVALIDGITLABURL');
});

test.serial("Throw SemanticReleaseError if token doesn't have the push permission on the repository", async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, {permissions: {project_access: {access_level: 10}, group_access: {access_level: 20}}});

  const aggregateError = await t.throwsAsync(
    verify({}, {env, options: {repositoryUrl: `https://gitlab.com:${owner}/${repo}.git`}, logger: t.context.logger}),
    AggregateError,
    'Error thrown but of unexpected type.'
  );
  const errors = [...aggregateError];

  const expectedNumOfErrors = 1;
  t.is(errors.length, expectedNumOfErrors, `Expected ${expectedNumOfErrors} error but got ${errors.length}.`);
  t.is(errors[0].name, 'SemanticReleaseError', 'Unexpected error name.');
  t.is(errors[0].code, 'EGLNOPERMISSION', 'Unexpected error code.');
  t.true(gitlab.isDone());
});

test.serial("Throw SemanticReleaseError if the repository doesn't exist", async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(404);

  const aggregateError = await t.throwsAsync(
    verify({}, {env, options: {repositoryUrl: `https://gitlab.com:${owner}/${repo}.git`}, logger: t.context.logger}),
    AggregateError,
    'Error thrown but of unexpected type.'
  );
  const errors = [...aggregateError];

  const expectedNumOfErrors = 1;
  t.is(errors.length, expectedNumOfErrors, `Expected ${expectedNumOfErrors} error but got ${errors.length}.`);
  t.is(errors[0].name, 'SemanticReleaseError', 'Unexpected error name.');
  t.is(errors[0].code, 'EMISSINGREPO', 'Unexpected error code.');
  t.true(gitlab.isDone());
});

test.serial('Throw error if GitLab API return any other errors', async t => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {GITLAB_TOKEN: 'gitlab_token'};
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .times(3)
    .reply(500);

  const error = await t.throwsAsync(
    verify({}, {env, options: {repositoryUrl: `https://gitlab.com:${owner}/${repo}.git`}, logger: t.context.logger}),
    HTTPError,
    'Error thrown but of unexpected type.'
  );

  t.is(error.statusCode, 500);
  t.true(gitlab.isDone());
});
