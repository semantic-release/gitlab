import test from "ava";
import nock from "nock";
import { stub } from "sinon";
import verify from "../lib/verify.js";
import authenticate from "./helpers/mock-gitlab.js";

/* eslint camelcase: ["error", {properties: "never"}] */

test.beforeEach((t) => {
  // Mock logger
  t.context.log = stub();
  t.context.error = stub();
  t.context.logger = { log: t.context.log, error: t.context.error };
});

test.afterEach.always(() => {
  // Clear nock
  nock.cleanAll();
});

test.serial("Verify token and repository access (project_access 30)", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 30 } } });

  await t.notThrowsAsync(
    verify(
      {},
      { env, options: { repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );
  t.true(gitlab.isDone());
});

test.serial("Verify token and repository access (project_access 40)", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      {},
      { env, options: { repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );
  t.true(gitlab.isDone());
});

test.serial("Verify token and repository access (group_access 30)", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 10 }, group_access: { access_level: 30 } } });

  await t.notThrowsAsync(
    verify(
      {},
      { env, options: { repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );
  t.true(gitlab.isDone());
});

test.serial("Verify token and repository access (group_access 40)", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 10 }, group_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      {},
      { env, options: { repositoryUrl: `git+https://gitalb.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );
  t.true(gitlab.isDone());
});

test.serial("Verify token and repository access and custom URL with prefix", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlabUrl = "https://othertesturl.com:9090";
  const gitlabApiPathPrefix = "prefix";
  const gitlab = authenticate(env, { gitlabUrl, gitlabApiPathPrefix })
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { gitlabUrl, gitlabApiPathPrefix },
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ["Verify GitLab authentication (%s)", "https://othertesturl.com:9090/prefix"]);
});

test.serial("Verify token and repository access and custom URL without prefix", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlabUrl = "https://othertesturl.com:9090";
  const gitlab = authenticate(env, { gitlabUrl })
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { gitlabUrl },
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ["Verify GitLab authentication (%s)", "https://othertesturl.com:9090/api/v4"]);
});

test.serial("Verify token and repository access with subgroup git URL", async (t) => {
  const repoUri = "orga/subgroup/test_user/test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlabUrl = "https://customurl.com:9090/context";
  const gitlabApiPathPrefix = "prefix";
  const gitlab = authenticate(env, { gitlabUrl, gitlabApiPathPrefix })
    .get(`/projects/${encodeURIComponent(repoUri)}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { gitlabUrl, gitlabApiPathPrefix },
      { env, options: { repositoryUrl: `git@customurl.com:${repoUri}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    "Verify GitLab authentication (%s)",
    "https://customurl.com:9090/context/prefix",
  ]);
});

test.serial("Verify token and repository access with subgroup http URL", async (t) => {
  const repoUri = "orga/subgroup/test_user/test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlabUrl = "https://customurl.com:9090/context";
  const gitlabApiPathPrefix = "prefix";
  const gitlab = authenticate(env, { gitlabUrl, gitlabApiPathPrefix })
    .get(`/projects/${encodeURIComponent(repoUri)}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { gitlabUrl, gitlabApiPathPrefix },
      { env, options: { repositoryUrl: `http://customurl.com/${repoUri}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    "Verify GitLab authentication (%s)",
    "https://customurl.com:9090/context/prefix",
  ]);
});

test.serial("Verify token and repository access with empty gitlabApiPathPrefix", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlabUrl = "https://othertesturl.com:9090";
  const gitlabApiPathPrefix = "";
  const gitlab = authenticate(env, { gitlabUrl, gitlabApiPathPrefix })
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { gitlabUrl, gitlabApiPathPrefix },
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ["Verify GitLab authentication (%s)", "https://othertesturl.com:9090"]);
});

test.serial("Verify token and repository with environment variables", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_URL: "https://othertesturl.com:443", GL_TOKEN: "gitlab_token", GL_PREFIX: "prefix" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      {},
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], ["Verify GitLab authentication (%s)", "https://othertesturl.com:443/prefix"]);
});

test.serial("Verify token and repository access with alternative environment varialbes", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_URL: "https://othertesturl.com:443", GITLAB_TOKEN: "gitlab_token", GITLAB_PREFIX: "prefix" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      {},
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );
  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is a String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_URL: "https://othertesturl.com:443", GITLAB_TOKEN: "gitlab_token", GITLAB_PREFIX: "prefix" };
  const assets = "file2.js";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { assets },
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is an Object with a path property', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_URL: "https://othertesturl.com:443", GITLAB_TOKEN: "gitlab_token", GITLAB_PREFIX: "prefix" };
  const assets = { path: "file2.js" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { assets },
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is an Array of Object with a path property', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_URL: "https://othertesturl.com:443", GITLAB_TOKEN: "gitlab_token", GITLAB_PREFIX: "prefix" };
  const assets = [{ path: "file1.js" }, { path: "file2.js" }];
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { assets },
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is an Array of glob Arrays', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_URL: "https://othertesturl.com:443", GITLAB_TOKEN: "gitlab_token", GITLAB_PREFIX: "prefix" };
  const assets = [["dist/**", "!**/*.js"], "file2.js"];
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { assets },
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Verify "assets" is an Array of Object with a glob Arrays in path property', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_URL: "https://othertesturl.com:443", GITLAB_TOKEN: "gitlab_token", GITLAB_PREFIX: "prefix" };
  const assets = [{ path: ["dist/**", "!**/*.js"] }, { path: "file2.js" }];
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { assets },
      { env, options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "assets" option is not a String or an Array of Objects', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const assets = 42;
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { assets },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDASSETS");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "assets" option is an Array with invalid elements', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const assets = ["file.js", 42];
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { assets },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDASSETS");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "assets" option is an Object missing the "path" property', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const assets = { name: "file.js" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { assets },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDASSETS");
  t.true(gitlab.isDone());
});

test.serial(
  'Throw SemanticReleaseError if "assets" option is an Array with objects missing the "path" property',
  async (t) => {
    const owner = "test_user";
    const repo = "test_repo";
    const env = { GITLAB_TOKEN: "gitlab_token" };
    const assets = [{ path: "lib/file.js" }, { name: "file.js" }];
    const gitlab = authenticate(env)
      .get(`/projects/${owner}%2F${repo}`)
      .reply(200, { permissions: { project_access: { access_level: 40 } } });

    const {
      errors: [error, ...errors],
    } = await t.throwsAsync(
      verify(
        { assets },
        { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
      )
    );

    t.is(errors.length, 0);
    t.is(error.name, "SemanticReleaseError");
    t.is(error.code, "EINVALIDASSETS");
    t.true(gitlab.isDone());
  }
);

test("Throw SemanticReleaseError for missing GitLab token", async (t) => {
  const env = {};
  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      {},
      { env, options: { repositoryUrl: "https://gitlab.com/semantic-release/gitlab.git" }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "ENOGLTOKEN");
});

test.serial("Throw SemanticReleaseError for invalid token", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env).get(`/projects/${owner}%2F${repo}`).reply(401);

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify({}, { env, options: { repositoryUrl: `https://gitlab.com:${owner}/${repo}.git` }, logger: t.context.logger })
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDGLTOKEN");
  t.true(gitlab.isDone());
});

test.serial("Throw SemanticReleaseError for invalid repositoryUrl", async (t) => {
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const gitlabUrl = "https://gitlab.com/context";

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { gitlabUrl },
      { env, options: { repositoryUrl: "git+ssh://git@gitlab.com/context.git" }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDGITLABURL");
});

test.serial("Throw AggregateError if multiple verification fails", async (t) => {
  const env = {};
  const gitlabUrl = "https://gitlab.com/context";
  const assets = 42;
  const {
    errors: [invalidAssetsError, invalidUrlError, noTokenError, ...errors],
  } = await t.throwsAsync(
    verify(
      { assets, gitlabUrl },
      { env, options: { repositoryUrl: "git+ssh://git@gitlab.com/context.git" }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(invalidAssetsError.name, "SemanticReleaseError");
  t.is(invalidAssetsError.code, "EINVALIDASSETS");
  t.is(invalidUrlError.name, "SemanticReleaseError");
  t.is(invalidUrlError.code, "EINVALIDGITLABURL");
  t.is(noTokenError.name, "SemanticReleaseError");
  t.is(noTokenError.code, "ENOGLTOKEN");
});

test.serial("Throw SemanticReleaseError if token doesn't have the push permission on the repository", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 10 }, group_access: { access_level: 20 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify({}, { env, options: { repositoryUrl: `https://gitlab.com:${owner}/${repo}.git` }, logger: t.context.logger })
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EGLNOPUSHPERMISSION");
  t.true(gitlab.isDone());
});

test.serial("Throw SemanticReleaseError if token doesn't have the pull permission on the repository", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 5 }, group_access: { access_level: 5 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      {},
      {
        env,
        options: { repositoryUrl: `https://gitlab.com:${owner}/${repo}.git`, dryRun: true },
        logger: t.context.logger,
      }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EGLNOPULLPERMISSION");
  t.true(gitlab.isDone());
});

test.serial("Throw SemanticReleaseError if the repository doesn't exist", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env).get(`/projects/${owner}%2F${repo}`).reply(404);

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify({}, { env, options: { repositoryUrl: `https://gitlab.com:${owner}/${repo}.git` }, logger: t.context.logger })
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EMISSINGREPO");
  t.true(gitlab.isDone());
});

test.serial("Throw error if GitLab API return any other errors", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env).get(`/projects/${owner}%2F${repo}`).times(3).reply(500);

  const error = await t.throwsAsync(
    verify({}, { env, options: { repositoryUrl: `https://gitlab.com:${owner}/${repo}.git` }, logger: t.context.logger })
  );

  t.is(error.response.status, 500);
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "failTitle" option is not a String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const failTitle = 42;
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { failTitle },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDFAILTITLE");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "failTitle" option is an empty String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const failTitle = "";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { failTitle },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDFAILTITLE");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "failTitle" option is a whitespace String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const failTitle = "  \n \r ";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { failTitle },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDFAILTITLE");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "failComment" option is not a String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const failComment = 42;
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { failComment },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDFAILCOMMENT");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "failComment" option is an empty String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const failComment = "";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { failComment },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDFAILCOMMENT");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "failComment" option is a whitespace String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const failComment = "  \n \r ";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { failComment },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDFAILCOMMENT");
  t.true(gitlab.isDone());
});

test.serial('Does not throw SemanticReleaseError if "labels" option is a valid String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const labels = "semantic-release";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { labels },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Does not throw SemanticReleaseError if "labels" option is "false"', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const labels = false;
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  await t.notThrowsAsync(
    verify(
      { labels },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "labels" option is not a String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const labels = 42;
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { labels },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDLABELS");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "labels" option is an empty String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const labels = "";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { labels },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDLABELS");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "labels" option is a whitespace String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const labels = "  \n \r ";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { labels },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDLABELS");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "assignee" option is not a String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const assignee = 42;
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { assignee },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDASSIGNEE");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "assignee" option is an empty String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const assignee = "";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { assignee },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDASSIGNEE");
  t.true(gitlab.isDone());
});

test.serial('Throw SemanticReleaseError if "assignee" option is a whitespace String', async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const assignee = "  \n \r ";
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 40 } } });

  const {
    errors: [error, ...errors],
  } = await t.throwsAsync(
    verify(
      { assignee },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );

  t.is(errors.length, 0);
  t.is(error.name, "SemanticReleaseError");
  t.is(error.code, "EINVALIDASSIGNEE");
  t.true(gitlab.isDone());
});

test.serial("Does not throw an error for option without validator", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GL_TOKEN: "gitlab_token" };
  const gitlab = authenticate(env)
    .get(`/projects/${owner}%2F${repo}`)
    .reply(200, { permissions: { project_access: { access_level: 30 } } });

  await t.notThrowsAsync(
    verify(
      {
        someOption: 42,
      },
      { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
    )
  );
  t.true(gitlab.isDone());
});

test.serial(
  'Won\'t throw SemanticReleaseError if "assets" option is an Array of objects with url field but missing the "path" property',
  async (t) => {
    const owner = "test_user";
    const repo = "test_repo";
    const env = { GITLAB_TOKEN: "gitlab_token" };
    const assets = [{ url: "https://gitlab.com/gitlab-org/gitlab/-/blob/master/README.md" }];
    const gitlab = authenticate(env)
      .get(`/projects/${owner}%2F${repo}`)
      .reply(200, { permissions: { project_access: { access_level: 40 } } });

    await t.notThrowsAsync(
      verify(
        { assets },
        { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
      )
    );
    t.true(gitlab.isDone());
  }
);

test.serial(
  'Won\'t throw SemanticReleaseError if "assets" option is an Array of objects with path field but missing the "url" property',
  async (t) => {
    const owner = "test_user";
    const repo = "test_repo";
    const env = { GITLAB_TOKEN: "gitlab_token" };
    const assets = [{ path: "README.md" }];
    const gitlab = authenticate(env)
      .get(`/projects/${owner}%2F${repo}`)
      .reply(200, { permissions: { project_access: { access_level: 40 } } });

    await t.notThrowsAsync(
      verify(
        { assets },
        { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
      )
    );
    t.true(gitlab.isDone());
  }
);

test.serial(
  'Throw SemanticReleaseError if "assets" option is an Array of objects without url nor path property',
  async (t) => {
    const owner = "test_user";
    const repo = "test_repo";
    const env = { GITLAB_TOKEN: "gitlab_token" };
    const assets = [{ name: "README.md" }];
    const gitlab = authenticate(env)
      .get(`/projects/${owner}%2F${repo}`)
      .reply(200, { permissions: { project_access: { access_level: 40 } } });

    const {
      errors: [error],
    } = await t.throwsAsync(
      verify(
        { assets },
        { env, options: { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` }, logger: t.context.logger }
      )
    );
    t.is(error.name, "SemanticReleaseError");
    t.is(error.code, "EINVALIDASSETS");
    t.true(gitlab.isDone());
  }
);
