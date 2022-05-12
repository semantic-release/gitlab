const {HOME_URL} = require('./definitions/constants');

const linkify = (releaseInfo) =>
  `${releaseInfo.url ? `[${releaseInfo.name}](${releaseInfo.url})` : `\`${releaseInfo.name}\``}`;

module.exports = (issueOrMergeRequest, releaseInfos, nextRelease) =>
  `:tada: This ${issueOrMergeRequest.isMergeRequest ? 'MR is included' : 'issue has been resolved'} in version ${
    nextRelease.version
  } :tada:${
    releaseInfos.length > 0
      ? `\n\nThe release is available on${
          releaseInfos.length === 1
            ? ` ${linkify(releaseInfos[0])}.`
            : `:\n${releaseInfos.map((releaseInfo) => `- ${linkify(releaseInfo)}`).join('\n')}`
        }`
      : ''
  }
\nYour **[semantic-release](${HOME_URL})** bot :package: :rocket:`;
