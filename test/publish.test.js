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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
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

test.serial("Publish a release with templated path", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token", FIXTURE: "upload" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const generic = { path: "${env.FIXTURE}.txt", filepath: "/upload.txt" };
  const assets = [generic];
  const uploaded = {
    url: "/uploads/upload.txt",
    alt: "upload.txt",
    full_path: "/-/project/4/66dbcd21ec5d24ed6ea225176098d52b/upload.txt",
  };
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: "upload.txt",
            url: `https://gitlab.com${uploaded.full_path}`,
            filepath: "/upload.txt",
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedProjectPath}/uploads`, /Content-Disposition/g)
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", `https://gitlab.com${uploaded.full_path}`]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial("Publish a release with assets", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = {
    url: "/uploads/file.css",
    alt: "file.css",
    full_path: "/-/project/4/66dbcd21ec5d24ed6ea225176098d52b/file.css",
  };
  const assets = [["**", "!**/*.txt", "!.dotfile"]];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: uploaded.alt,
            url: `https://gitlab.com${uploaded.full_path}`,
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedProjectPath}/uploads`, /filename="file.css"/gm)
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", `https://gitlab.com${uploaded.full_path}`]);
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const encodedVersion = encodeURIComponent(nextRelease.version);
  const uploaded = { file: { url: "/uploads/file.css" } };
  const generic = { path: "file.css", label: "Style package", target: "generic_package", status: "hidden" };
  const assets = [generic];
  const encodedLabel = encodeURIComponent(generic.label);
  const expectedUrl = `https://gitlab.com/api/v4/projects/${encodedProjectPath}/packages/generic/release/${encodedVersion}/${encodedLabel}`;
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
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
      `/projects/${encodedProjectPath}/packages/generic/release/${encodedVersion}/${encodedLabel}?status=${generic.status}&select=package_file`,
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const encodedVersion = encodeURIComponent(nextRelease.version);
  const uploaded = { file: { url: "http://aws.example.com/bucket/gitlab/file.css" } };
  const generic = { path: "file.css", label: "Style package", target: "generic_package", status: "hidden" };
  const assets = [generic];
  const encodedLabel = encodeURIComponent(generic.label);
  const expectedUrl = `https://gitlab.com/api/v4/projects/${encodedProjectPath}/packages/generic/release/${encodedVersion}/${encodedLabel}`;
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
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
      `/projects/${encodedProjectPath}/packages/generic/release/${encodedVersion}/${encodedLabel}?status=${generic.status}&select=package_file`,
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const encodedVersion = encodeURIComponent(nextRelease.version);
  const uploaded = { file: { url: "https://aws.example.com/bucket/gitlab/file.css" } };
  const generic = { path: "file.css", label: "Style package", target: "generic_package", status: "hidden" };
  const assets = [generic];
  const encodedLabel = encodeURIComponent(generic.label);
  const expectedUrl = `https://gitlab.com/api/v4/projects/${encodedProjectPath}/packages/generic/release/${encodedVersion}/${encodedLabel}`;
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
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
      `/projects/${encodedProjectPath}/packages/generic/release/${encodedVersion}/${encodedLabel}?status=${generic.status}&select=package_file`,
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const encodedVersion = encodeURIComponent(nextRelease.version);
  const uploaded = { file: { url: "ftp://drive.example.com/gitlab/file.css" } };
  const generic = { path: "file.css", label: "Style package", target: "generic_package", status: "hidden" };
  const assets = [generic];
  const encodedLabel = encodeURIComponent(generic.label);
  const expectedUrl = `https://gitlab.com/api/v4/projects/${encodedProjectPath}/packages/generic/release/${encodedVersion}/${encodedLabel}`;
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
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
      `/projects/${encodedProjectPath}/packages/generic/release/${encodedVersion}/${encodedLabel}?status=${generic.status}&select=package_file`,
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = {
    url: "/uploads/file.css",
    alt: "file.css",
    link_type: "package",
    filepath: "/dist/file.css",
    full_path: "/-/project/4/66dbcd21ec5d24ed6ea225176098d52b/file.css",
  };
  const assets = [
    {
      path: ["**", "!**/*.txt", "!.dotfile"],
      type: "package",
      filepath: "/dist/file.css",
    },
  ];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: uploaded.alt,
            url: `https://gitlab.com${uploaded.full_path}`,
            link_type: uploaded.link_type,
            filepath: uploaded.filepath,
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedProjectPath}/uploads`, /filename="file.css"/gm)
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", `https://gitlab.com${uploaded.full_path}`]);
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = {
    url: "/uploads/file.css",
    alt: "file.css",
    full_path: "/-/project/4/66dbcd21ec5d24ed6ea225176098d52b/file.css",
  };
  const assets = [
    {
      label: `file-v\${nextRelease.version}.css`,
      path: "file.css",
      type: "other",
      filepath: "/dist/file.css",
    },
  ];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: "file-v1.0.0.css",
            url: `https://gitlab.com${uploaded.full_path}`,
            link_type: "other",
            filepath: "/dist/file.css",
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedProjectPath}/uploads`, /filename="file.css"/gm)
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", `https://gitlab.com${uploaded.full_path}`]);
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = {
    url: "/uploads/file.css",
    alt: "file.css",
    full_path: "/-/project/4/66dbcd21ec5d24ed6ea225176098d52b/file.css",
  };
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
    .post(`/projects/${encodedProjectPath}/releases`, {
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
            url: `https://gitlab.com${uploaded.full_path}`,
            link_type: "other",
            filepath: "/dist/file.css",
          },
        ],
      },
    })
    .reply(200);

  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedProjectPath}/uploads`, /filename="file.css"/gm)
    .reply(200, uploaded);
  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", `https://gitlab.com${uploaded.full_path}`]);
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const emptyDirectory = tempy.directory();
  const assets = [emptyDirectory, { path: "missing.txt", label: "missing.txt" }];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = {
    url: "/uploads/upload.txt",
    full_path: "/-/project/4/66dbcd21ec5d24ed6ea225176098d52b/upload.txt",
  };
  const assetLabel = "Custom Label";
  const assets = [{ path: "upload.txt", label: assetLabel }];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: assetLabel,
            url: `https://gitlab.com${uploaded.full_path}`,
          },
        ],
      },
    })
    .reply(200);
  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedProjectPath}/uploads`, /filename="upload.txt"/gm)
    .reply(200, uploaded);

  const result = await publish({ assets }, { env, cwd, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", `https://gitlab.com${uploaded.full_path}`]);
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
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
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const link = {
    label: "README.md",
    type: "other",
    url: "https://gitlab.com/gitlab-org/gitlab/-/blob/master/README.md",
  };
  const assets = [link];
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
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

test.serial("Publish a release with error response", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = {};
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [],
      },
    })
    .reply(499, { message: "Something went wrong" });

  const error = await t.throwsAsync(publish(pluginConfig, { env, options, nextRelease, logger: t.context.logger }));
  t.is(error.message, `Response code 499 (Something went wrong)`);
  t.true(gitlab.isDone());
});

test.serial("Publish a release with releasedAt", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = { releasedAt: "2025-01-24T12:00:00Z" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);

  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      released_at: nextRelease.releasedAt,
      assets: {
        links: [],
      },
      released_at: pluginConfig.releasedAt,
    })
    .reply(200);

  const result = await publish(pluginConfig, { env, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial("Publish a release with future dated releasedAt", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  const futureReleaseDate = oneWeekFromNow.toISOString();
  const pluginConfig = { releasedAt: futureReleaseDate };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);

  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      released_at: nextRelease.releasedAt,
      assets: {
        links: [],
      },
      released_at: pluginConfig.releasedAt,
    })
    .reply(200);

  const result = await publish(pluginConfig, { env, options, nextRelease, logger: t.context.logger });

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlab.isDone());
});

test.serial("Publish a release with releasedAt and assets", async (t) => {
  const cwd = "test/fixtures/files";
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = { releasedAt: "2025-01-24T12:00:00Z" };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);
  const uploaded = {
    url: "/uploads/file.css",
    alt: "file.css",
    full_path: "/-/project/4/66dbcd21ec5d24ed6ea225176098d52b/file.css",
  };
  const assets = [["**", "!**/*.txt", "!.dotfile"]]; // Changed to match successful test

  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      assets: {
        links: [
          {
            name: uploaded.alt,
            url: `https://gitlab.com${uploaded.full_path}`,
          },
        ],
      },
      released_at: pluginConfig.releasedAt,
    })
    .reply(200);

  const gitlabUpload = authenticate(env)
    .post(`/projects/${encodedProjectPath}/uploads`, /filename="file.css"/gm) // Added regex pattern
    .reply(200, uploaded);

  const result = await publish(
    { ...pluginConfig, assets },
    { env, cwd, options, nextRelease, logger: t.context.logger }
  );

  t.is(result.url, `https://gitlab.com/${owner}/${repo}/-/releases/${encodedGitTag}`);
  t.deepEqual(t.context.log.args[0], ["Uploaded file: %s", `https://gitlab.com${uploaded.full_path}`]);
  t.deepEqual(t.context.log.args[1], ["Published GitLab release: %s", nextRelease.gitTag]);
  t.true(gitlabUpload.isDone());
  t.true(gitlab.isDone());
});

test.serial("Publish a release with explicit null releasedAt", async (t) => {
  const owner = "test_user";
  const repo = "test_repo";
  const env = { GITLAB_TOKEN: "gitlab_token" };
  const pluginConfig = { releasedAt: null };
  const nextRelease = { gitHead: "123", gitTag: "v1.0.0", notes: "Test release note body" };
  const options = { repositoryUrl: `https://gitlab.com/${owner}/${repo}.git` };
  const encodedProjectPath = encodeURIComponent(`${owner}/${repo}`);
  const encodedGitTag = encodeURIComponent(nextRelease.gitTag);

  const gitlab = authenticate(env)
    .post(`/projects/${encodedProjectPath}/releases`, {
      tag_name: nextRelease.gitTag,
      description: nextRelease.notes,
      released_at: pluginConfig.releasedAt,
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
