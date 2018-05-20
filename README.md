# @semantic-release/gitlab

Set of [Semantic-release](https://github.com/semantic-release/semantic-release) plugins for publishing a
[GitLab release](https://docs.gitlab.com/ce/workflow/releases.html).

[![Travis](https://img.shields.io/travis/semantic-release/gitlab.svg)](https://travis-ci.org/semantic-release/gitlab)
[![Codecov](https://img.shields.io/codecov/c/github/semantic-release/gitlab.svg)](https://codecov.io/gh/semantic-release/gitlab)
[![Greenkeeper badge](https://badges.greenkeeper.io/semantic-release/gitlab.svg)](https://greenkeeper.io/)

[![npm latest version](https://img.shields.io/npm/v/@semantic-release/gitlab/latest.svg)](https://www.npmjs.com/package/@semantic-release/gitlab)
[![npm next version](https://img.shields.io/npm/v/@semantic-release/gitlab/next.svg)](https://www.npmjs.com/package/@semantic-release/gitlab)

## verifyConditions

Verify the presence and the validity of the authentication (set via [environment variables](#environment-variables)).

## publish

Publish a [GitLab release](https://docs.gitlab.com/ce/workflow/releases.html).

## Configuration

### GitLab authentication

The GitLab authentication configuration is **required** and can be set via
[environment variables](#environment-variables).

Only the [personal access token](https://docs.gitlab.com/ce/user/profile/personal_access_tokens.html)
authentication is supported.

### Environment variables

| Variable                       | Description                                               |
|--------------------------------|-----------------------------------------------------------|
| `GL_TOKEN` or `GITLAB_TOKEN`   | **Required.** The token used to authenticate with GitLab. |
| `GL_URL` or `GITLAB_URL`       | The GitLab endpoint.                                      |
| `GL_PREFIX` or `GITLAB_PREFIX` | The GitLab API prefix.                                    |

### Options

| Option                | Description            | Default                                                                |
|-----------------------|------------------------|------------------------------------------------------------------------|
| `gitlabUrl`           | The GitLab endpoint.   | `GL_URL` or `GITLAB_URL` environment variable or `https://gitlab.com`. |
| `gitlabApiPathPrefix` | The GitLab API prefix. | `GL_PREFIX` or `GITLAB_PREFIX` environment variable or `/api/v4`.      |

### Usage

Options can be set within the plugin definition in the Semantic-release configuration file:

```json
{
  "release": {
    "verifyConditions": [
      "@semantic-release/npm",
      "@semantic-release/gitlab",
      {
        "path": "@semantic-release/gitlab",
        "gitlabUrl": "https://custom.gitlab.com"
      }
    ],
    "publish": [
      "@semantic-release/npm",
      "@semantic-release/gitlab",
      {
        "path": "@semantic-release/gitlab",
        "gitlabUrl": "https://custom.gitlab.com"
      }
    ],
    "success": false,
    "fail": false
  }
}
```
