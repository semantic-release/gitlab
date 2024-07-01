import test from "ava";
import nock from "nock";
import { stub } from "sinon";
import fail from "../lib/fail.js";
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

test.serial("Post new issue if none exists yet", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {};
  const branch = { name: "main" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}/issues?state=opened&&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "https://gitlab.com/test_user/test_repo/issues/2",
        title: "API should implemented authentication",
      },
    ])
    .post(`/projects/${encodedRepoId}/issues`, {
      id: "test_user%2Ftest_repo",
      description: `## :rotating_light: The automated release from the \`main\` branch failed. :rotating_light:

I recommend you give this issue a high priority, so other packages depending on you can benefit from your bug fixes and new features again.

You can find below the list of errors reported by **semantic-release**. Each one of them has to be resolved in order to automatically publish your package. I'm sure you can fix this 💪.

Errors are usually caused by a misconfiguration or an authentication problem. With each error reported below you will find explanation and guidance to help you to resolve it.

Once all the errors are resolved, **semantic-release** will release your package the next time you push a commit to the \`main\` branch. You can also manually restart the failed CI job that runs **semantic-release**.

If you are not sure how to resolve this, here are some links that can help you:
- [Usage documentation](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/README.md)
- [Frequently Asked Questions](https://github.com/semantic-release/semantic-release/blob/master/docs/support/FAQ.md)
- [Support channels](https://github.com/semantic-release/semantic-release#get-help)

If those don't help, or if this issue is reporting something you think isn't right, you can always ask the humans behind **[semantic-release](https://github.com/semantic-release/semantic-release/issues/new)**.

---

### An error occured

Unfortunately this error doesn't have any additional information.

---

Good luck with your project ✨

Your **[semantic-release](https://github.com/semantic-release/semantic-release)** bot :package: :rocket:`,
      labels: "semantic-release",
      title: "The automated release is failing 🚨",
    })
    .reply(200, { id: 3, web_url: "https://gitlab.com/test_user/test_repo/-/issues/3" });

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    "Created issue #%d: %s.",
    3,
    "https://gitlab.com/test_user/test_repo/-/issues/3",
  ]);
});

test.serial("Post comments to existing issue", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {};
  const branch = { name: "main" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}/issues?state=opened&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 1,
        iid: 1,
        project_id: 1,
        web_url: "https://gitlab.com/test_user%2Ftest_repo/issues/1",
        title: "The automated release is failing 🚨",
      },
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "https://gitlab.com/test_user%2Ftest_repo/issues/2",
        title: "API should implemented authentication",
      },
    ])
    .post(`/projects/1/issues/1/notes`, {
      body: `## :rotating_light: The automated release from the \`main\` branch failed. :rotating_light:

I recommend you give this issue a high priority, so other packages depending on you can benefit from your bug fixes and new features again.

You can find below the list of errors reported by **semantic-release**. Each one of them has to be resolved in order to automatically publish your package. I'm sure you can fix this 💪.

Errors are usually caused by a misconfiguration or an authentication problem. With each error reported below you will find explanation and guidance to help you to resolve it.

Once all the errors are resolved, **semantic-release** will release your package the next time you push a commit to the \`main\` branch. You can also manually restart the failed CI job that runs **semantic-release**.

If you are not sure how to resolve this, here are some links that can help you:
- [Usage documentation](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/README.md)
- [Frequently Asked Questions](https://github.com/semantic-release/semantic-release/blob/master/docs/support/FAQ.md)
- [Support channels](https://github.com/semantic-release/semantic-release#get-help)

If those don't help, or if this issue is reporting something you think isn't right, you can always ask the humans behind **[semantic-release](https://github.com/semantic-release/semantic-release/issues/new)**.

---

### An error occured

Unfortunately this error doesn't have any additional information.

---

Good luck with your project ✨

Your **[semantic-release](https://github.com/semantic-release/semantic-release)** bot :package: :rocket:`,
    })
    .reply(200);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Post comments to existing issue with custom template", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: `Error: Release for branch \${branch.name} failed with error: \${errors.map(error => error.message).join(';')}`,
    failTitle: "Semantic Release Failure",
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("Semantic Release Failure");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}/issues?state=opened&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 1,
        iid: 1,
        project_id: 1,
        web_url: "https://gitlab.com/test_user%2Ftest_repo/issues/1",
        title: "Semantic Release Failure",
      },
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "https://gitlab.com/test_user%2Ftest_repo/issues/2",
        title: "API should implemented authentication",
      },
    ])
    .post(`/projects/1/issues/1/notes`, {
      body: `Error: Release for branch main failed with error: An error occured`,
    })
    .reply(200);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments when failTitle and failComment are both set to false", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: false,
    failTitle: false,
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const gitlab = authenticate(env);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments when failTitle is set to false", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: `Error: Release for branch \${branch.name} failed with error: \${errors.map(error => error.message).join(';')}`,
    failTitle: false,
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const gitlab = authenticate(env);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments when failComment is set to false", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: false,
    failTitle: "Semantic Release Failure",
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const gitlab = authenticate(env);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments when failCommentCondition disables it", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = { failCommentCondition: "<% return false; %>" };
  const branch = { name: "main" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}/issues?state=opened&&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "https://gitlab.com/test_user/test_repo/issues/2",
        title: "API should implemented authentication",
      },
    ]);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Does not post comments on existing issues when failCommentCondition disables this", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = { failCommentCondition: "<% return !issue; %>" };
  const branch = { name: "main" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}/issues?state=opened&&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 1,
        iid: 1,
        project_id: 1,
        web_url: "https://gitlab.com/test_user%2Ftest_repo/issues/1",
        title: "The automated release is failing 🚨",
      },
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "https://gitlab.com/test_user%2Ftest_repo/issues/2",
        title: "API should implemented authentication",
      },
    ]);

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
});

test.serial("Post new issue if none exists yet with disabled comment on existing issues", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {
    failComment: `Error: Release for branch \${branch.name} failed with error: \${errors.map(error => error.message).join(';')}`,
    failCommentCondition: "<% return !issue; %>",
  };
  const branch = { name: "main" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const errors = [{ message: "An error occured" }];
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedFailTitle = encodeURIComponent("The automated release is failing 🚨");
  const gitlab = authenticate(env)
    .get(`/projects/${encodedRepoId}/issues?state=opened&&search=${encodedFailTitle}`)
    .reply(200, [
      {
        id: 2,
        iid: 2,
        project_id: 1,
        web_url: "https://gitlab.com/test_user/test_repo/issues/2",
        title: "API should implemented authentication",
      },
    ])
    .post(`/projects/${encodedRepoId}/issues`, {
      id: "test_user%2Ftest_repo",
      description: `Error: Release for branch main failed with error: An error occured`,
      labels: "semantic-release",
      title: "The automated release is failing 🚨",
    })
    .reply(200, { id: 3, web_url: "https://gitlab.com/test_user/test_repo/-/issues/3" });

  await fail(pluginConfig, { env, options, branch, errors, logger: t.context.logger });

  t.true(gitlab.isDone());
  t.deepEqual(t.context.log.args[0], [
    "Created issue #%d: %s.",
    3,
    "https://gitlab.com/test_user/test_repo/-/issues/3",
  ]);
});
