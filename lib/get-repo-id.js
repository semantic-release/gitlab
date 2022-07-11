const parseUrl = require('parse-url');
const escapeStringRegexp = require('escape-string-regexp');

module.exports = ({envCi: {service} = {}, env: {CI_PROJECT_PATH}}, gitlabUrl, repositoryUrl) =>
  service === 'gitlab' && CI_PROJECT_PATH
    ? CI_PROJECT_PATH
    : parseUrl(repositoryUrl)
        .pathname.replace(new RegExp(`^${escapeStringRegexp(parseUrl(gitlabUrl).pathname)}`), '')
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .replace(/\.git$/, '');
