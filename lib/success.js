const {uniqWith, isEqual} = require('lodash');
const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');
const {RELEASE_NAME} = require('./definitions/constants');

module.exports = async (pluginConfig, context) => {
  const {
    options: {repositoryUrl},
    nextRelease: {gitTag},
    logger,
    commits,
    releases,
  } = context;
  const {gitlabToken, gitlabUrl, gitlabApiUrl, postComments} = resolveConfig(pluginConfig, context);
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);
  const encodedRepoId = encodeURIComponent(repoId);
  const apiOptions = {headers: {'PRIVATE-TOKEN': gitlabToken}};

  const release = releases.find(release => release.name && release.name === RELEASE_NAME);

  if (postComments) {
    try {
      const postCommentToIssue = issue => {
        const issueNotesEndpoint = urlJoin(gitlabApiUrl, `/projects/${issue.project_id}/issues/${issue.iid}/notes`);
        debug('Posting issue note to %s', issueNotesEndpoint);
        return got.post(issueNotesEndpoint, {
          ...apiOptions,
          json: {
            body: `:tada: This issue has been resolved in version ${gitTag} :tada:\n\nThe release is available on [Gitlab Release](${release.url})`,
          },
        });
      };

      const postCommentToMergeRequest = mergeRequest => {
        const mergeRequestNotesEndpoint = urlJoin(
          gitlabApiUrl,
          `/projects/${mergeRequest.project_id}/merge_requests/${mergeRequest.iid}/notes`
        );
        debug('Posting MR note to %s', mergeRequestNotesEndpoint);
        return got.post(mergeRequestNotesEndpoint, {
          ...apiOptions,
          json: {
            body: `:tada: This MR is included in version ${gitTag} :tada:\n\nThe release is available on [Gitlab Release](${release.url})`,
          },
        });
      };

      const getRelatedMergeRequests = async commitHash => {
        const relatedMergeRequestsEndpoint = urlJoin(
          gitlabApiUrl,
          `/projects/${encodedRepoId}/repository/commits/${commitHash}/merge_requests`
        );
        debug('Getting MRs from %s', relatedMergeRequestsEndpoint);
        const relatedMergeRequests = await got
          .get(relatedMergeRequestsEndpoint, {
            ...apiOptions,
          })
          .json();

        return relatedMergeRequests.filter(x => x.state === 'merged');
      };

      const getRelatedIssues = async mergeRequest => {
        const relatedIssuesEndpoint = urlJoin(
          gitlabApiUrl,
          `/projects/${mergeRequest.project_id}/merge_requests/${mergeRequest.iid}/closes_issues`
        );
        debug('Getting related issues from %s', relatedIssuesEndpoint);
        const relatedIssues = await got
          .get(relatedIssuesEndpoint, {
            ...apiOptions,
          })
          .json();

        return relatedIssues.filter(x => x.state === 'closed');
      };

      const relatedMergeRequests = uniqWith(
        (await Promise.all(commits.map(x => x.hash).map(getRelatedMergeRequests))).flat(),
        isEqual
      );
      const relatedIssues = uniqWith((await Promise.all(relatedMergeRequests.map(getRelatedIssues))).flat(), isEqual);
      await Promise.all(relatedIssues.map(postCommentToIssue));
      await Promise.all(relatedMergeRequests.map(postCommentToMergeRequest));
    } catch (error) {
      logger.error('An error occurred while posting comments to related issues and merge requests:\n%O', error);
      throw error;
    }
  }
};
