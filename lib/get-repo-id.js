const parsePath = require('parse-path');
const escapeStringRegexp = require('escape-string-regexp');

module.exports = ({envCi: {service} = {}, env: {CI_PROJECT_PATH}}, gitlabUrl, repositoryUrl) =>
  service === 'gitlab' && CI_PROJECT_PATH
    ? CI_PROJECT_PATH
    : parsePath(repositoryUrl)
        .pathname.replace(new RegExp(`^${escapeStringRegexp(parsePath(gitlabUrl).pathname)}`), '')
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .replace(/\.git$/, '');
