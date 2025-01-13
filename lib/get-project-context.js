import escapeStringRegexp from "escape-string-regexp";
import parseUrl from "parse-url";
import urlJoin from "url-join";

export default (
  { envCi: { service } = {}, env: { CI_PROJECT_ID, CI_PROJECT_PATH } },
  gitlabUrl,
  gitlabApiUrl,
  repositoryUrl
) => {
  const projectId = service === "gitlab" && CI_PROJECT_ID ? CI_PROJECT_ID : null;
  const projectPath =
    service === "gitlab" && CI_PROJECT_PATH
      ? CI_PROJECT_PATH
      : parseUrl(repositoryUrl)
          .pathname.replace(new RegExp(`^${escapeStringRegexp(parseUrl(gitlabUrl).pathname)}`), "")
          .replace(/^\//, "")
          .replace(/\/$/, "")
          .replace(/\.git$/, "");
  const encodedProjectPath = encodeURIComponent(projectPath);
  const projectApiUrl = urlJoin(gitlabApiUrl, `/projects/${projectId ?? encodedProjectPath}`);
  return {
    projectPath,
    encodedProjectPath,
    projectApiUrl,
  };
};
