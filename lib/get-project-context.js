import urlJoin from "url-join";

import getProjectPath from "./get-project-path.js";

export default (context, gitlabUrl, gitlabApiUrl, repositoryUrl) => {
  const projectPath = getProjectPath(context, gitlabUrl, repositoryUrl);
  const encodedProjectPath = encodeURIComponent(projectPath);
  const projectApiUrl = urlJoin(gitlabApiUrl, `/projects/${encodedProjectPath}`);
  return {
    projectPath,
    encodedProjectPath,
    projectApiUrl,
  };
};
