# @semantic-release/gitlab

[**semantic-release**](https://github.com/semantic-release/semantic-release) plugin to publish a
[GitLab release](https://docs.gitlab.com/ee/user/project/releases/).

[![Build Status](https://github.com/semantic-release/gitlab/workflows/Test/badge.svg)](https://github.com/semantic-release/gitlab/actions?query=workflow%3ATest+branch%3Amaster) [![npm latest version](https://img.shields.io/npm/v/@semantic-release/gitlab/latest.svg)](https://www.npmjs.com/package/@semantic-release/gitlab)
[![npm next version](https://img.shields.io/npm/v/@semantic-release/gitlab/next.svg)](https://www.npmjs.com/package/@semantic-release/gitlab)

| Step               | Description                                                                                                           |
|--------------------|-----------------------------------------------------------------------------------------------------------------------|
| `verifyConditions` | Verify the presence and the validity of the authentication (set via [environment variables](#environment-variables)). |
| `publish`          | Publish a [GitLab release](https://docs.gitlab.com/ee/user/project/releases/).                                        |

## Install

```bash
$ npm install @semantic-release/gitlab -D
```

## Usage

The plugin can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/gitlab", {
      "gitlabUrl": "https://custom.gitlab.com",
      "assets": [
        {"path": "dist/asset.min.css", "label": "CSS distribution"},
        {"path": "dist/asset.min.js", "label": "JS distribution"}
      ]
    }],
  ]
}
```

With this example [GitLab releases](https://docs.gitlab.com/ee/user/project/releases/) will be published to the `https://custom.gitlab.com` instance.

## Configuration

### GitLab authentication

The GitLab authentication configuration is **required** and can be set via
[environment variables](#environment-variables).

Create a [personal access token](https://docs.gitlab.com/ce/user/profile/personal_access_tokens.html) with the `api` scope and make it available in your CI environment via the `GL_TOKEN` environment variable. If you are using `GL_TOKEN` as the [remote Git repository authentication](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/ci-configuration.md#authentication) it must also have the `write_repository` scope.

### Environment variables

| Variable                       | Description                                               |
|--------------------------------|-----------------------------------------------------------|
| `GL_TOKEN` or `GITLAB_TOKEN`   | **Required.** The token used to authenticate with GitLab. |
| `GL_URL` or `GITLAB_URL`       | The GitLab endpoint.                                      |
| `GL_PREFIX` or `GITLAB_PREFIX` | The GitLab API prefix.                                    |

### Options

| Option                | Description                                                                                                                                    | Default                                                                                                                                                                 |
|-----------------------|------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `gitlabUrl`           | The GitLab endpoint.                                                                                                                           | `GL_URL` or `GITLAB_URL` environment variable or CI provided environment variables if running on [GitLab CI/CD](https://docs.gitlab.com/ee/ci) or `https://gitlab.com`. |
| `gitlabApiPathPrefix` | The GitLab API prefix.                                                                                                                         | `GL_PREFIX` or `GITLAB_PREFIX` environment variable or CI provided environment variables if running on [GitLab CI/CD](https://docs.gitlab.com/ee/ci) or `/api/v4`.      |
| `assets`              | An array of files to upload to the release. See [assets](#assets).                                                                             | -                                                                                                                                                                       |
| `milestones`          | An array of milestone titles to associate to the release. See [GitLab Release API](https://docs.gitlab.com/ee/api/releases/#create-a-release). | -                                                                                                                                                                       |

#### assets

Can be a [glob](https://github.com/isaacs/node-glob#glob-primer) or and `Array` of
[globs](https://github.com/isaacs/node-glob#glob-primer) and `Object`s with the following properties:

| Property | Description                                                                                                 | Default                              |
| -------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `path`   | **Required.** A [glob](https://github.com/isaacs/node-glob#glob-primer) to identify the files to upload.    | -                                    |
| `label`  | Short description of the file displayed on the GitLab release. Ignored if `path` matches more than one file.| File name extracted from the `path`. |
| `type` | Asset type displayed on the GitLab release. Can be `runbook`, `package`, `image` and `other` (see official documents on [release assets](https://docs.gitlab.com/ee/user/project/releases/#release-assets)). | `other` |
| `filepath` | A filepath for creating a permalink pointing to the asset (requires GitLab 12.9+, see official documents on [permanent links](https://docs.gitlab.com/ee/user/project/releases/#permanent-links-to-release-assets)). Ignored if `path` matches more than one file. | - |

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
