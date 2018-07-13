module.exports = ({gitlabUrl, gitlabApiPathPrefix}, {env}) => ({
  gitlabToken: env.GL_TOKEN || env.GITLAB_TOKEN,
  gitlabUrl: gitlabUrl || env.GL_URL || env.GITLAB_URL || 'https://gitlab.com',
  gitlabApiPathPrefix:
    typeof gitlabApiPathPrefix === 'string'
      ? gitlabApiPathPrefix
      : null || typeof env.GL_PREFIX === 'string'
        ? env.GL_PREFIX
        : null || typeof env.GITLAB_PREFIX === 'string'
          ? env.GITLAB_PREFIX
          : null || '/api/v4',
});
