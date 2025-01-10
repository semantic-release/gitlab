import urlJoin from "url-join";

import getProjectPath from "./get-project-path.js";
import getProjectId from "./get-project-id.js";

export default (context, gitlabUrl, gitlabApiUrl, repositoryUrl) => {
  const projectId = getProjectId(context);
  const projectPath = getProjectPath(context, gitlabUrl, repositoryUrl);
  const encodedProjectPath = encodeURIComponent(projectPath);
  const projectApiUrl = urlJoin(gitlabApiUrl, `/projects/${projectId ?? encodedProjectPath}`);
  return {
    projectPath,
    encodedProjectPath,
    projectApiUrl,
  };
};
