const {inspect} = require('util');
const pkg = require('../../package.json');

const [homepage] = pkg.homepage.split('#');
const linkify = (file) => `${homepage}/blob/master/${file}`;
const stringify = (object) => inspect(object, {breakLength: Number.POSITIVE_INFINITY, depth: 2, maxArrayLength: 5});

module.exports = {
  EINVALIDASSETS: ({assets}) => ({
    message: 'Invalid `assets` option.',
    details: `The [assets option](${linkify(
      'README.md#assets'
    )}) must be an \`Array\` of \`Strings\` or \`Objects\` with a \`path\` property.
Your configuration for the \`assets\` option is \`${stringify(assets)}\`.`,
  }),
  EINVALIDFAILTITLE: ({failTitle}) => ({
    message: 'Invalid `failTitle` option.',
    details: `The [failTitle option](${linkify('README.md#failtitle')}) if defined, must be a non empty \`String\`.

Your configuration for the \`failTitle\` option is \`${stringify(failTitle)}\`.`,
  }),
  EINVALIDFAILCOMMENT: ({failComment}) => ({
    message: 'Invalid `failComment` option.',
    details: `The [failComment option](${linkify('README.md#failcomment')}) if defined, must be a non empty \`String\`.

Your configuration for the \`failComment\` option is \`${stringify(failComment)}\`.`,
  }),
  EINVALIDLABELS: ({labels}) => ({
    message: 'Invalid `labels` option.',
    details: `The [labels option](${linkify('README.md#labels')}) if defined, must be a non empty \`String\`.

Your configuration for the \`labels\` option is \`${stringify(labels)}\`.`,
  }),
  EINVALIDASSIGNEE: ({assignee}) => ({
    message: 'Invalid `assignee` option.',
    details: `The [assignee option](${linkify('README.md#assignee')}) if defined, must be a non empty \`String\`.

    Your configuration for the \`assignee\` option is \`${stringify(assignee)}\`.`,
  }),
  EINVALIDGITLABURL: () => ({
    message: 'The git repository URL is not a valid GitLab URL.',
    details: `The **semantic-release** \`repositoryUrl\` option must a valid GitLab URL with the format \`<GitLab_URL>/<repoId>.git\`.

By default the \`repositoryUrl\` option is retrieved from the \`repository\` property of your \`package.json\` or the [git origin url](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes) of the repository cloned by your CI environment.`,
  }),
  EINVALIDGLTOKEN: ({repoId}) => ({
    message: 'Invalid GitLab token.',
    details: `The [GitLab token](${linkify(
      'README.md#gitlab-authentication'
    )}) configured in the \`GL_TOKEN\` or \`GITLAB_TOKEN\` environment variable must be a valid [personal access token](https://docs.gitlab.com/ce/user/profile/personal_access_tokens.html) allowing to push to the repository ${repoId}.

Please make sure to set the \`GL_TOKEN\` or \`GITLAB_TOKEN\` environment variable in your CI with the exact value of the GitLab personal token.`,
  }),
  EMISSINGREPO: ({repoId}) => ({
    message: `The repository ${repoId} doesn't exist.`,
    details: `The **semantic-release** \`repositoryUrl\` option must refer to your GitLab repository. The repository must be accessible with the [GitLab API](https://docs.gitlab.com/ce/api/README.html).

By default the \`repositoryUrl\` option is retrieved from the \`repository\` property of your \`package.json\` or the [git origin url](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes) of the repository cloned by your CI environment.

If you are using [GitLab Enterprise Edition](https://about.gitlab.com/gitlab-ee) please make sure to configure the \`gitlabUrl\` and \`gitlabApiPathPrefix\` [options](${linkify(
      'README.md#options'
    )}).`,
  }),
  EGLNOPUSHPERMISSION: ({repoId}) => ({
    message: `The GitLab token doesn't allow to push on the repository ${repoId}.`,
    details: `The user associated with the [GitLab token](${linkify(
      'README.md#gitlab-authentication'
    )}) configured in the \`GL_TOKEN\` or \`GITLAB_TOKEN\` environment variable must allows to push to the repository ${repoId}.

Please make sure the GitLab user associated with the token has the [permission to push](https://docs.gitlab.com/ee/user/permissions.html#project-members-permissions) to the repository ${repoId}.`,
  }),
  EGLNOPULLPERMISSION: ({repoId}) => ({
    message: `The GitLab token doesn't allow to pull from the repository ${repoId}.`,
    details: `The user associated with the [GitLab token](${linkify(
      'README.md#gitlab-authentication'
    )}) configured in the \`GL_TOKEN\` or \`GITLAB_TOKEN\` environment variable must allow pull from the repository ${repoId}.

Please make sure the GitLab user associated with the token has the [permission to push](https://docs.gitlab.com/ee/user/permissions.html#project-members-permissions) to the repository ${repoId}.`,
  }),
  ENOGLTOKEN: ({repositoryUrl}) => ({
    message: 'No GitLab token specified.',
    details: `A [GitLab personal access token](${linkify(
      'README.md#gitlab-authentication'
    )}) must be created and set in the \`GL_TOKEN\` or \`GITLAB_TOKEN\` environment variable on your CI environment.

Please make sure to create a [GitLab personal access token](https://docs.gitlab.com/ce/user/profile/personal_access_tokens.html) and to set it in the \`GL_TOKEN\` or \`GITLAB_TOKEN\` environment variable on your CI environment. The token must allow to push to the repository ${repositoryUrl}.`,
  }),
};
