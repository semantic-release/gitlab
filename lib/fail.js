import { template } from "lodash-es";
import urlJoin from "url-join";
import got from "got";
import _debug from "debug";
const debug = _debug("semantic-release:gitlab");
import resolveConfig from "./resolve-config.js";
import getRepoId from "./get-repo-id.js";
import getFailComment from "./get-fail-comment.js";

export default async (pluginConfig, context) => {
  const {
    options: { repositoryUrl },
    branch,
    errors,
    logger,
  } = context;
  const { gitlabToken, gitlabUrl, gitlabApiUrl, failComment, failTitle, labels, assignee } = resolveConfig(
    pluginConfig,
    context
  );
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);
  const encodedRepoId = encodeURIComponent(repoId);
  const apiOptions = { headers: { "PRIVATE-TOKEN": gitlabToken } };

  if (failComment === false || failTitle === false) {
    logger.log("Skip issue creation.");
  } else {
    const encodedFailTitle = encodeURIComponent(failTitle);
    const description = failComment ? template(failComment)({ branch, errors }) : getFailComment(branch, errors);

    const issuesEndpoint = urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/issues`);
    const openFailTitleIssueEndpoint = urlJoin(issuesEndpoint, `?state=opened&search=${encodedFailTitle}`);

    const openFailTitleIssues = await got(openFailTitleIssueEndpoint, { ...apiOptions }).json();
    const existingIssue = openFailTitleIssues.find((openFailTitleIssue) => openFailTitleIssue.title === failTitle);

    if (existingIssue) {
      debug("comment on issue: %O", existingIssue);

      const issueNotesEndpoint = urlJoin(
        gitlabApiUrl,
        `/projects/${existingIssue.project_id}/issues/${existingIssue.iid}/notes`
      );
      await got.post(issueNotesEndpoint, {
        ...apiOptions,
        json: { body: description },
      });

      const { id, web_url } = existingIssue;
      logger.log("Commented on issue #%d: %s.", id, web_url);
    } else {
      const newIssue = { id: encodedRepoId, description, labels, title: failTitle, assignee_id: assignee };
      debug("create issue: %O", newIssue);

      /* eslint camelcase: off */
      const { id, web_url } = await got.post(issuesEndpoint, {
        ...apiOptions,
        json: newIssue,
      });
      logger.log("Created issue #%d: %s.", id, web_url);
    }
  }
};
