import { castArray, isNil } from "lodash-es";
import urlJoin from "url-join";

export default (
  {
    gitlabUrl,
    gitlabApiPathPrefix,
    assets,
    milestones,
    successComment,
    successCommentCondition,
    failTitle,
    failComment,
    failCommentCondition,
    labels,
    assignee,
    retryLimit,
  },
  {
    envCi: { service } = {},
    env: {
      CI_PROJECT_URL,
      CI_PROJECT_PATH,
      CI_API_V4_URL,
      GL_TOKEN,
      GITLAB_TOKEN,
      GL_URL,
      GITLAB_URL,
      GL_PREFIX,
      GITLAB_PREFIX,
    },
  }
) => {
  const DEFAULT_RETRY_LIMIT = 3;
  const userGitlabApiPathPrefix = isNil(gitlabApiPathPrefix)
    ? isNil(GL_PREFIX)
      ? GITLAB_PREFIX
      : GL_PREFIX
    : gitlabApiPathPrefix;
  const userGitlabUrl = gitlabUrl || GL_URL || GITLAB_URL;
  const defaultedGitlabUrl =
    userGitlabUrl ||
    (service === "gitlab" && CI_PROJECT_URL && CI_PROJECT_PATH
      ? CI_PROJECT_URL.replace(new RegExp(`/${CI_PROJECT_PATH}$`), "")
      : "https://gitlab.com");
  return {
    gitlabToken: GL_TOKEN || GITLAB_TOKEN,
    gitlabUrl: defaultedGitlabUrl,
    gitlabApiUrl:
      userGitlabUrl && userGitlabApiPathPrefix
        ? urlJoin(userGitlabUrl, userGitlabApiPathPrefix)
        : service === "gitlab" && CI_API_V4_URL
          ? CI_API_V4_URL
          : urlJoin(defaultedGitlabUrl, isNil(userGitlabApiPathPrefix) ? "/api/v4" : userGitlabApiPathPrefix),
    assets: assets ? castArray(assets) : assets,
    milestones: milestones ? castArray(milestones) : milestones,
    successComment,
    successCommentCondition,
    failTitle: isNil(failTitle) ? "The automated release is failing 🚨" : failTitle,
    failComment,
    failCommentCondition,
    labels: isNil(labels) ? "semantic-release" : labels === false ? false : labels,
    assignee,
    retryLimit: retryLimit ?? DEFAULT_RETRY_LIMIT,
  };
};
