module.exports = ({gitlabUrl, gitlabApiPathPrefix}) => ({
  gitlabToken: process.env.GL_TOKEN || process.env.GITLAB_TOKEN,
  gitlabUrl: gitlabUrl || process.env.GL_URL || process.env.GITLAB_URL || 'https://gitlab.com',
  gitlabApiPathPrefix:
    typeof gitlabApiPathPrefix === 'string'
      ? gitlabApiPathPrefix
      : null || typeof process.env.GL_PREFIX === 'string'
        ? process.env.GL_PREFIX
        : null || typeof process.env.GITLAB_PREFIX === 'string' ? process.env.GITLAB_PREFIX : null || '/api/v4',
});
