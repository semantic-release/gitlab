# @semantic-release/gitlab

[**semantic-release**](https://github.com/semantic-release/semantic-release) plugin to publish a
[GitLab release](https://docs.gitlab.com/ee/user/project/releases/).

[![Build Status](https://github.com/semantic-release/gitlab/workflows/Test/badge.svg)](https://github.com/semantic-release/gitlab/actions?query=workflow%3ATest+branch%3Amaster) [![npm latest version](https://img.shields.io/npm/v/@semantic-release/gitlab/latest.svg)](https://www.npmjs.com/package/@semantic-release/gitlab)
[![npm next version](https://img.shields.io/npm/v/@semantic-release/gitlab/next.svg)](https://www.npmjs.com/package/@semantic-release/gitlab)

| Step               | Description                                                                                                                                         |
|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `verifyConditions` | Verify the presence and the validity of the authentication (set via [environment variables](#environment-variables)).                               |
| `publish`          | Publish a [GitLab release](https://docs.gitlab.com/ee/user/project/releases/).                                                                      |
| `success`          | Add a comment to each GitLab Issue or Merge Request resolved by the release.                                                                        |
| `fail`             | Open or update a [GitLab Issue](https://docs.gitlab.com/ee/user/project/issues/) with information about the errors that caused the release to fail. |

## Install

```bash
$ npm install @semantic-release/gitlab -D
```

## Usage

The plugin can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/gitlab", {
      "gitlabUrl": "https://custom.gitlab.com",
      "assets": [
        {"path": "dist/asset.min.css", "label": "CSS distribution"},
        {"path": "dist/asset.min.js", "label": "JS distribution"},
        {"path": "dist/asset.min.js", "label": "v${nextRelease.version}.js"},
        {"url": "https://gitlab.com/gitlab-org/gitlab/-/blob/master/README.md"}
      ]
    }]
  ]
}
```

With this example [GitLab releases](https://docs.gitlab.com/ee/user/project/releases/) will be published to the `https://custom.gitlab.com` instance.

## Configuration

### GitLab authentication

The GitLab authentication configuration is **required** and can be set via
[environment variables](#environment-variables).

Create a [personal access token](https://docs.gitlab.com/ce/user/profile/personal_access_tokens.html) with the `api` scope and make it available in your CI environment via the `GL_TOKEN` environment variable. If you are using `GL_TOKEN` as the [remote Git repository authentication](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/ci-configuration.md#authentication) it must also have the `write_repository` scope.

**Note**: When running with [`dryRun`](https://semantic-release.gitbook.io/semantic-release/usage/configuration#dryrun) only `read_repository` scope is required.

### Environment variables

| Variable                       | Description                                               |
|--------------------------------|-----------------------------------------------------------|
| `GL_TOKEN` or `GITLAB_TOKEN`   | **Required.** The token used to authenticate with GitLab. |
| `GL_URL` or `GITLAB_URL`       | The GitLab endpoint.                                      |
| `GL_PREFIX` or `GITLAB_PREFIX` | The GitLab API prefix.                                    |
| `HTTP_PROXY` or `HTTPS_PROXY`  | HTTP or HTTPS proxy to use.                               |
| `NO_PROXY`                     | Patterns for which the proxy should be ignored. See [details below](#proxy-configuration). |

#### Proxy configuration

The plugin supports passing requests through a proxy server. 

You can configure a proxy server via the `HTTPS_PROXY` environment variable: `HTTPS_PROXY=http://proxyurl.com:8080`

If your proxy server requires authentication embed the username and password in the URL: `HTTPS_PROXY=http://user:pwd@proxyurl.com:8080`

If your GitLab instance is exposed via plain HTTP (not recommended!) use `HTTP_PROXY` instead.

If you need to bypass the proxy for some hosts, configure the `NO_PROXY` environment variable: `NO_PROXY=*.host.com, host.com`

### Options

| Option                | Description                                                                                                                                                     | Default                                                                                                                                                                 |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `gitlabUrl`           | The GitLab endpoint.                                                                                                                                            | `GL_URL` or `GITLAB_URL` environment variable or CI provided environment variables if running on [GitLab CI/CD](https://docs.gitlab.com/ee/ci) or `https://gitlab.com`. |
| `gitlabApiPathPrefix` | The GitLab API prefix.                                                                                                                                          | `GL_PREFIX` or `GITLAB_PREFIX` environment variable or CI provided environment variables if running on [GitLab CI/CD](https://docs.gitlab.com/ee/ci) or `/api/v4`.      |
| `assets`              | An array of files to upload to the release. See [assets](#assets).                                                                                              | -                                                                                                                                                                       |
| `milestones`          | An array of milestone titles to associate to the release. See [GitLab Release API](https://docs.gitlab.com/ee/api/releases/#create-a-release).                  | -                                                                                                                                                                       |
| `successComment`      | The comment to add to each Issue and Merge Request resolved by the release. Set to false to disable commenting. See [successComment](#successComment).          | :tada: This issue has been resolved in version ${nextRelease.version} :tada:\n\nThe release is available on [GitLab release](<gitlab_release_url>)                      |
| `failComment`         | The content of the issue created when a release fails. Set to `false` to disable opening an issue when a release fails. See [failComment](#failcomment).        | Friendly message with links to **semantic-release** documentation and support, with the list of errors that caused the release to fail.                                 |
| `failTitle`           | The title of the issue created when a release fails. Set to `false` to disable opening an issue when a release fails.                                           | `The automated release is failing 🚨`                                                                                                                                    |
| `labels`              | The [labels](https://docs.gitlab.com/ee/user/project/labels.html#labels) to add to the issue created when a release fails. Set to `false` to not add any label. Labels should be comma-separated as described in the [official docs](https://docs.gitlab.com/ee/api/issues.html#new-issue), e.g. `"semantic-release,bot"`. | `semantic-release`                                                                                                                                                      |
| `assignee`            | The [assignee](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#assignee) to add to the issue created when a release fails.                  | -                                                                                                                                                                       |

#### assets

Can be a [glob](https://github.com/isaacs/node-glob#glob-primer) or and `Array` of
[globs](https://github.com/isaacs/node-glob#glob-primer) and `Object`s with the following properties:

| Property | Description                                                                                                 | Default                              |
| -------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `path`   | **Required**, unless `url` is set. A [glob](https://github.com/isaacs/node-glob#glob-primer) to identify the files to upload.    | -                                    |
| `url`    | Alternative to setting `path` this provides the ability to add links to releases, e.g. URLs to container images. Supports [Lodash templating](https://lodash.com/docs#template).                           | -                                    |
| `label`  | Short description of the file displayed on the GitLab release. Ignored if `path` matches more than one file. Supports [Lodash templating](https://lodash.com/docs#template). | File name extracted from the `path`. |
| `type` | Asset type displayed on the GitLab release. Can be `runbook`, `package`, `image` and `other` (see official documents on [release assets](https://docs.gitlab.com/ee/user/project/releases/#release-assets)). Supports [Lodash templating](https://lodash.com/docs#template). | `other` |
| `filepath` | A filepath for creating a permalink pointing to the asset (requires GitLab 12.9+, see official documents on [permanent links](https://docs.gitlab.com/ee/user/project/releases/#permanent-links-to-release-assets)). Ignored if `path` matches more than one file. Supports [Lodash templating](https://lodash.com/docs#template). | - |

Each entry in the `assets` `Array` is globbed individually. A [glob](https://github.com/isaacs/node-glob#glob-primer)
can be a `String` (`"dist/**/*.js"` or `"dist/mylib.js"`) or an `Array` of `String`s that will be globbed together
(`["dist/**", "!**/*.css"]`).

If a directory is configured, all the files under this directory and its children will be included.

**Note**: If a file has a match in `assets` it will be included even if it also has a match in `.gitignore`.

##### assets examples

`'dist/*.js'`: include all the `js` files in the `dist` directory, but not in its sub-directories.

`[['dist', '!**/*.css']]`: include all the files in the `dist` directory and its sub-directories excluding the `css`
files.

`[{path: 'dist/MyLibrary.js', label: 'MyLibrary JS distribution'}, {path: 'dist/MyLibrary.css', label: 'MyLibrary CSS
distribution'}]`: include the `dist/MyLibrary.js` and `dist/MyLibrary.css` files, and label them `MyLibrary JS
distribution` and `MyLibrary CSS distribution` in the GitLab release.

`[['dist/**/*.{js,css}', '!**/*.min.*'], {path: 'build/MyLibrary.zip', label: 'MyLibrary'}]`: include all the `js` and
`css` files in the `dist` directory and its sub-directories excluding the minified version, plus the
`build/MyLibrary.zip` file and label it `MyLibrary` in the GitLab release.

#### successComment

The message for the issue comments is generated with [Lodash template](https://lodash.com/docs#template). The following variables are available:

| Parameter      | Description                                                                                                                                                                                                                                                                   |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `branch`       | `Object` with `name`, `type`, `channel`, `range` and `prerelease` properties of the branch from which the release is done.                                                                                                                                                    |
| `lastRelease`  | `Object` with `version`, `channel`, `gitTag` and `gitHead` of the last release.                                                                                                                                                                                               |
| `nextRelease`  | `Object` with `version`, `channel`, `gitTag`, `gitHead` and `notes` of the release being done.                                                                                                                                                                                |
| `commits`      | `Array` of commit `Object`s with `hash`, `subject`, `body` `message` and `author`.                                                                                                                                                                                            |
| `releases`     | `Array` with a release `Object`s for each release published, with optional release data such as `name` and `url`.                                                                                                                                                             |
| `issue`        | A [GitLab API Issue object](https://docs.gitlab.com/ee/api/issues.html#single-issue) the comment will be posted to, or `false` when commenting Merge Requests.
| `mergeRequest` | A [GitLab API Merge Request object](https://docs.gitlab.com/ee/api/merge_requests.html#get-single-mr) the comment will be posted to, or `false` when commenting Issues.

#### failComment

The message for the issue content is generated with [Lodash template](https://lodash.com/docs#template). The following variables are available:

| Parameter | Description                                                                                                                                                                                                                                                                                                            |
|-----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `branch`  | The branch from which the release had failed.                                                                                                                                                                                                                                                                          |
| `errors`  | An `Array` of [SemanticReleaseError](https://github.com/semantic-release/error). Each error has the `message`, `code`, `pluginName` and `details` properties.<br>`pluginName` contains the package name of the plugin that threw the error.<br>`details` contains a information about the error formatted in markdown. |

##### failComment example

The `failComment` `This release from branch ${branch.name} had failed due to the following errors:\n- ${errors.map(err => err.message).join('\\n- ')}` will generate the comment:

> This release from branch master had failed due to the following errors:
> - Error message 1
> - Error message 2

## Compatibility

The latest version of this plugin is compatible with all currently-supported versions of GitLab, [which is the current major version and previous two major versions](https://about.gitlab.com/support/statement-of-support.html#version-support). This plugin is not guaranteed to work with unsupported versions of GitLab.

### Breaking changes in 14.0

If you are using GitLab.com or have upgraded your self-hosted GitLab instance to 14.0, please use version `>=6.0.7` of this plugin.

#### Why?

In GitLab 14.0, creating a release using the [Tags API](https://docs.gitlab.com/ee/api/tags.html) has been removed (see [<span>#</span>290311](https://gitlab.com/gitlab-org/gitlab/-/issues/290311)). This plugin was updated to use the [Releases API](https://docs.gitlab.com/ee/api/releases/#create-a-release) instead in https://github.com/semantic-release/gitlab/pull/184, which is available in version `6.0.7` and beyond.
