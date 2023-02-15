import test from "ava";
import nock from "nock";
import tempy from "tempy";
import { stub } from "sinon";
import publish from "../lib/publish.js";
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

test.serial("Publish a release", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {};
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [],
      },
    })
    .reply(200);

  const result = await publish(pluginConfig, { env, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial("Publish a release with assets", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = { url: "/uploads/file.css", alt: "file.css" };
  const assets = [["**", "!**/*.txt", "!.dotfile"]];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: uploaded.alt,
            url: `https://gitlab.com/${owner}/${repo}${uploaded.url}`,
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedRepoId}/uploads`, /filename="file.css"/gm)
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", uploaded.url]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial("Publish a release with generics", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body", version: "1.0.0" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const encodedVersion = encodeURIComponent(nextRelease.version);
  const uploaded = { file: { url: "/uploads/file.css" } };
  const generic = { path: "file.css", label: "Style package", target: "generic_package", status: "hidden" };
  const assets = [generic];
  const encodedLabel = encodeURIComponent(generic.label);
  const expectedUrl = `https://gitlab.com/api/v4/projects/${encodedRepoId}/packages/generic/release/${encodedVersion}/${encodedLabel}`;
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: "Style package",
            url: expectedUrl,
            link_type: "package",
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .put(
      `/projects/${encodedRepoId}/packages/generic/release/${encodedVersion}/${encodedLabel}?status=${generic.status}&select=package_file`,
      /\.test\s\{\}/gm
    )
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s (%s)", expectedUrl, uploaded.file.url]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial("Publish a release with generics and external storage provider (http)", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body", version: "1.0.0" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const encodedVersion = encodeURIComponent(nextRelease.version);
  const uploaded = { file: { url: "http://aws.example.com/bucket/gitlab/file.css" } };
  const generic = { path: "file.css", label: "Style package", target: "generic_package", status: "hidden" };
  const assets = [generic];
  const encodedLabel = encodeURIComponent(generic.label);
  const expectedUrl = `https://gitlab.com/api/v4/projects/${encodedRepoId}/packages/generic/release/${encodedVersion}/${encodedLabel}`;
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: "Style package",
            url: expectedUrl,
            link_type: "package",
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .put(
      `/projects/${encodedRepoId}/packages/generic/release/${encodedVersion}/${encodedLabel}?status=${generic.status}&select=package_file`,
      /\.test\s\{\}/gm
    )
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s (%s)", expectedUrl, uploaded.file.url]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial("Publish a release with generics and external storage provider (https)", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body", version: "1.0.0" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const encodedVersion = encodeURIComponent(nextRelease.version);
  const uploaded = { file: { url: "https://aws.example.com/bucket/gitlab/file.css" } };
  const generic = { path: "file.css", label: "Style package", target: "generic_package", status: "hidden" };
  const assets = [generic];
  const encodedLabel = encodeURIComponent(generic.label);
  const expectedUrl = `https://gitlab.com/api/v4/projects/${encodedRepoId}/packages/generic/release/${encodedVersion}/${encodedLabel}`;
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: "Style package",
            url: expectedUrl,
            link_type: "package",
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .put(
      `/projects/${encodedRepoId}/packages/generic/release/${encodedVersion}/${encodedLabel}?status=${generic.status}&select=package_file`,
      /\.test\s\{\}/gm
    )
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s (%s)", expectedUrl, uploaded.file.url]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial("Publish a release with generics and external storage provider (ftp)", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body", version: "1.0.0" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const encodedVersion = encodeURIComponent(nextRelease.version);
  const uploaded = { file: { url: "ftp://drive.example.com/gitlab/file.css" } };
  const generic = { path: "file.css", label: "Style package", target: "generic_package", status: "hidden" };
  const assets = [generic];
  const encodedLabel = encodeURIComponent(generic.label);
  const expectedUrl = `https://gitlab.com/api/v4/projects/${encodedRepoId}/packages/generic/release/${encodedVersion}/${encodedLabel}`;
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: "Style package",
            url: expectedUrl,
            link_type: "package",
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .put(
      `/projects/${encodedRepoId}/packages/generic/release/${encodedVersion}/${encodedLabel}?status=${generic.status}&select=package_file`,
      /\.test\s\{\}/gm
    )
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s (%s)", expectedUrl, uploaded.file.url]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial("Publish a release with asset type and permalink", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = { url: "/uploads/file.css", alt: "file.css", link_type: "package", filepath: "/dist/file.css" };
  const assets = [
    {
      path: ["**", "!**/*.txt", "!.dotfile"],
      type: "package",
      filepath: "/dist/file.css",
    },
  ];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: uploaded.alt,
            url: `https://gitlab.com/${owner}/${repo}${uploaded.url}`,
            link_type: uploaded.link_type,
            filepath: uploaded.filepath,
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedRepoId}/uploads`, /filename="file.css"/gm)
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", uploaded.url]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial("Publish a release with an asset with a template label", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body", version: "1.0.0" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = { url: "/uploads/file.css", alt: "file.css" };
  const assets = [
    {
      label: `file-v\${nextRelease.version}.css`,
      path: "file.css",
      type: "other",
      filepath: "/dist/file.css",
    },
  ];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: "file-v1.0.0.css",
            url: `https://gitlab.com/${owner}/${repo}${uploaded.url}`,
            link_type: "other",
            filepath: "/dist/file.css",
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedRepoId}/uploads`, /filename="file.css"/gm)
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", uploaded.url]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial("Publish a release (with an link) with variables", async (t) => {
  process.env.TYPE = "other";
  process.env.FILEPATH = "/dist/file.css";
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body", version: "1.0.0" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = { url: "/uploads/file.css", alt: "file.css" };
  const assets = [
    {
      label: `README-v\${nextRelease.version}.md`,
      type: `\${process.env.TYPE}`,
      url: `https://gitlab.com/gitlab-org/gitlab/-/blob/master/README-v\${nextRelease.version}.md`,
    },
    {
      label: "file.css",
      path: "file.css",
      type: "other",
      filepath: `\${process.env.FILEPATH}`,
    },
  ];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: "README-v1.0.0.md",
            url: "https://gitlab.com/gitlab-org/gitlab/-/blob/master/README-v1.0.0.md",
            link_type: "other",
          },
          {
            name: "file.css",
            url: `https://gitlab.com/${owner}/${repo}${uploaded.url}`,
            link_type: "other",
            filepath: "/dist/file.css",
          },
        ],
      },
    })
    .reply(200);

  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedRepoId}/uploads`, /filename="file.css"/gm)
    .reply(200, uploaded);
  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", uploaded.url]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());

  delete process.env.TYPE;
  delete process.env.FILEPATH;
});

test.serial("Publish a release with a milestone", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = { milestones: ["1.2.3"] };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [],
      },
      milestones: ["1.2.3"],
    })
    .reply(200);

  const result = await publish(pluginConfig, { env, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial("Publish a release with array of missing assets", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const emptyDirectory = tempy.directory();
  const assets = [emptyDirectory, { path: "missing.txt", label: "missing.txt" }];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [],
      },
    })
    .reply(200);
  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial("Publish a release with one asset and custom label", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = { url: "/uploads/upload.txt" };
  const assetLabel = "Custom Label";
  const assets = [{ path: "upload.txt", label: assetLabel }];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: assetLabel,
            url: `https://gitlab.com/${owner}/${repo}${uploaded.url}`,
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedRepoId}/uploads`, /filename="upload.txt"/gm)
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", uploaded.url]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial("Publish a release with missing release notes", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {};
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.gitTag,
      assets: {
        links: [],
      },
    })
    .reply(200);

  const result = await publish(pluginConfig, { env, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial("Publish a release with an asset link", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedRepoId = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const link = {
    label: "README.md",
    type: "other",
    url: "https://gitlab.com/gitlab-org/gitlab/-/blob/master/README.md",
  };
  const assets = [link];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedRepoId}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: "README.md",
            url: `https://gitlab.com/gitlab-org/gitlab/-/blob/master/README.md`,
            link_type: "other",
          },
        ],
      },
    })
    .reply(200);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlab.isDone());
});
