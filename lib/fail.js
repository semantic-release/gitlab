import { EnvHttpProxyAgent } from "undici";
import { template } from "lodash-es";
import urlJoin from "url-join";
import ky from "ky";
import _debug from "debug";
const debug = _debug("semantic-release:gitlab");
import resolveConfig from "./resolve-config.js";
import getFailComment from "./get-fail-comment.js";
import getProjectContext from "./get-project-context.js";

export default async (pluginConfig, context) => {
  const {
    options: { repositoryUrl },
    branch,
    errors,
    logger,
  } = context;
  const {
    gitlabToken,
    gitlabUrl,
    gitlabApiUrl,
    failComment,
    failTitle,
    failCommentCondition,
    labels,
    assignee,
    retryLimit,
  } = resolveConfig(pluginConfig, context);
  const { encodedProjectPath, projectApiUrl } = getProjectContext(context, gitlabUrl, gitlabApiUrl, repositoryUrl);

  const apiOptions = {
    headers: { "PRIVATE-TOKEN": gitlabToken },
    retry: { limit: retryLimit },
  };
  const kyInstance = ky.create(apiOptions).extend({ dispatcher: new EnvHttpProxyAgent() });

  if (failComment === false || failTitle === false) {
    logger.log("Skip issue creation.");
    logger.error(`Failure reporting should be disabled via 'failCommentCondition'.
Using 'false' for 'failComment' or 'failTitle' is deprecated and will be removed in a future major version.`);
  } else if (failCommentCondition === false) {
    logger.log("Skip issue creation.");
  } else {
    const encodedFailTitle = encodeURIComponent(failTitle);
    const description = failComment ? template(failComment)({ branch, errors }) : getFailComment(branch, errors);

    const issuesEndpoint = urlJoin(projectApiUrl, `issues`);
    const openFailTitleIssueEndpoint = urlJoin(issuesEndpoint, `?state=opened&search=${encodedFailTitle}`);

    const openFailTitleIssues = await kyInstance.get(openFailTitleIssueEndpoint).json();
    const existingIssue = openFailTitleIssues.find((openFailTitleIssue) => openFailTitleIssue.title === failTitle);

    const canCommentOnOrCreateIssue = failCommentCondition
      ? template(failCommentCondition)({ ...context, issue: existingIssue })
      : true;
    if (canCommentOnOrCreateIssue) {
      if (existingIssue) {
        debug("comment on issue: %O", existingIssue);

        const issueNotesEndpoint = urlJoin(
          gitlabApiUrl,
          `/projects/${existingIssue.project_id}/issues/${existingIssue.iid}/notes`
        );
        await kyInstance.post(issueNotesEndpoint, {
          json: { body: description },
        });

        const { id, web_url } = existingIssue;
        logger.log("Commented on issue #%d: %s.", id, web_url);
      } else {
        const newIssue = { id: encodedProjectPath, description, labels, title: failTitle, assignee_id: assignee };
        debug("create issue: %O", newIssue);

        /* eslint camelcase: off */
        const { id, web_url } = await kyInstance
          .post(issuesEndpoint, {
            json: newIssue,
          })
          .json();
        logger.log("Created issue #%d: %s.", id, web_url);
      }
    } else {
      logger.log("Skip commenting on or creating an issue.");
    }
  }
};
