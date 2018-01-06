const parsePath = require('parse-path');
const escapeStringRegexp = require('escape-string-regexp');

module.exports = (gitlabUrl, repositoryUrl) => {
  return parsePath(repositoryUrl)
    .pathname.replace(new RegExp(`^${escapeStringRegexp(parsePath(gitlabUrl).pathname)}`), '')
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/\.git$/, '');
};
