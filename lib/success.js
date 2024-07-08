import { uniqWith, isEqual, template } from "lodash-es";
import urlJoin from "url-join";
import got from "got";
import _debug from "debug";
const debug = _debug("semantic-release:gitlab");
import resolveConfig from "./resolve-config.js";
import getRepoId from "./get-repo-id.js";
import getSuccessComment from "./get-success-comment.js";

export default async (pluginConfig, context) => {
  const {
    options: { repositoryUrl },
    nextRelease,
    logger,
    commits,
    releases,
  } = context;
  const { gitlabToken, gitlabUrl, gitlabApiUrl, successComment, successCommentCondition, proxy } = resolveConfig(
    pluginConfig,
    context
  );
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);
  const encodedRepoId = encodeURIComponent(repoId);
  const apiOptions = { headers: { "PRIVATE-TOKEN": gitlabToken } };

  if (successComment === false) {
    logger.log("Skip commenting on issues and pull requests.");
    logger.error(`Issue and pull request comments should be disabled via 'successCommentCondition'.
Using 'false' for 'successComment' is deprecated and will be removed in a future major version.`);
  } else if (successCommentCondition === false) {
    logger.log("Skip commenting on issues and pull requests.");
  } else {
    const releaseInfos = releases.filter((release) => Boolean(release.name));
    try {
      const postCommentToIssue = (issue) => {
        const canCommentOnIssue = successCommentCondition
          ? template(successCommentCondition)({ ...context, issue, mergeRequest: false })
          : true;
        if (canCommentOnIssue) {
          const issueNotesEndpoint = urlJoin(gitlabApiUrl, `/projects/${issue.project_id}/issues/${issue.iid}/notes`);
          debug("Posting issue note to %s", issueNotesEndpoint);
          const body = successComment
            ? template(successComment)({ ...context, issue, mergeRequest: false })
            : getSuccessComment(issue, releaseInfos, nextRelease);
          return got.post(issueNotesEndpoint, {
            ...apiOptions,
            ...proxy,
            json: { body },
          });
        } else {
          logger.log("Skip commenting on issue #%d.", issue.id);
        }
      };

      const postCommentToMergeRequest = (mergeRequest) => {
        const canCommentOnMergeRequest = successCommentCondition
          ? template(successCommentCondition)({ ...context, issue: false, mergeRequest })
          : true;
        if (canCommentOnMergeRequest) {
          const mergeRequestNotesEndpoint = urlJoin(
            gitlabApiUrl,
            `/projects/${mergeRequest.project_id}/merge_requests/${mergeRequest.iid}/notes`
          );
          debug("Posting MR note to %s", mergeRequestNotesEndpoint);
          const body = successComment
            ? template(successComment)({ ...context, issue: false, mergeRequest })
            : getSuccessComment({ isMergeRequest: true, ...mergeRequest }, releaseInfos, nextRelease);
          return got.post(mergeRequestNotesEndpoint, {
            ...apiOptions,
            ...proxy,
            json: { body },
          });
        } else {
          logger.log("Skip commenting on merge request #%d.", mergeRequest.iid);
        }
      };

      const getRelatedMergeRequests = async (commitHash) => {
        const relatedMergeRequestsEndpoint = urlJoin(
          gitlabApiUrl,
          `/projects/${encodedRepoId}/repository/commits/${commitHash}/merge_requests`
        );
        debug("Getting MRs from %s", relatedMergeRequestsEndpoint);
        const relatedMergeRequests = await got
          .get(relatedMergeRequestsEndpoint, {
            ...apiOptions,
            ...proxy,
          })
          .json();

        return relatedMergeRequests.filter((x) => x.state === "merged");
      };

      const getRelatedIssues = async (mergeRequest) => {
        const relatedIssuesEndpoint = urlJoin(
          gitlabApiUrl,
          `/projects/${mergeRequest.project_id}/merge_requests/${mergeRequest.iid}/closes_issues`
        );
        debug("Getting related issues from %s", relatedIssuesEndpoint);
        const relatedIssues = await got
          .get(relatedIssuesEndpoint, {
            ...apiOptions,
            ...proxy,
          })
          .json();

        return relatedIssues.filter((x) => x.state === "closed");
      };

      const relatedMergeRequests = uniqWith(
        (await Promise.all(commits.map((commit) => getRelatedMergeRequests(commit.hash)))).flat(),
        isEqual
      );
      const relatedIssues = uniqWith(
        (await Promise.all(relatedMergeRequests.map((mergeRequest) => getRelatedIssues(mergeRequest)))).flat(),
        isEqual
      );
      await Promise.all(relatedIssues.map((issues) => postCommentToIssue(issues)));
      await Promise.all(relatedMergeRequests.map((mergeRequest) => postCommentToMergeRequest(mergeRequest)));
    } catch (error) {
      logger.error("An error occurred while posting comments to related issues and merge requests:\n%O", error);
      throw error;
    }
  }
};
