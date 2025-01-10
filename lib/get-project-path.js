import parseUrl from "parse-url";
import escapeStringRegexp from "escape-string-regexp";

export default ({ envCi: { service } = {}, env: { CI_PROJECT_PATH } }, gitlabUrl, repositoryUrl) =>
  service === "gitlab" && CI_PROJECT_PATH
    ? CI_PROJECT_PATH
    : parseUrl(repositoryUrl)
        .pathname.replace(new RegExp(`^${escapeStringRegexp(parseUrl(gitlabUrl).pathname)}`), "")
        .replace(/^\//, "")
        .replace(/\/$/, "")
        .replace(/\.git$/, "");
