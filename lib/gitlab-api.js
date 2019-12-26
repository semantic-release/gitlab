const got = require('got');
const urlJoin = require('url-join');

function createGitlabApi(gitlabApiUrl, {token}) {
  const apiOptions = {json: true, headers: {'PRIVATE-TOKEN': token}};

  const links = async (repoId, gitTag, {name, url}) => {
    const linksUrl = urlJoin(
      gitlabApiUrl,
      `/projects/${encodeURIComponent(repoId)}/releases/${encodeURIComponent(gitTag)}/assets/links`
    );

    return got.post(linksUrl, {
      ...apiOptions,
      body: {name, url},
    });
  };

  const uploads = async (repoId, data) => {
    const uploadsUrl = urlJoin(gitlabApiUrl, `/projects/${encodeURIComponent(repoId)}/uploads`);

    const res = await got.post(uploadsUrl, {
      ...apiOptions,
      json: false,
      body: data,
    });

    return JSON.parse(res.body);
  };

  const release = (repoId, gitTag, description) => {
    const releaseUrl = urlJoin(
      gitlabApiUrl,
      `/projects/${encodeURIComponent(repoId)}/repository/tags/${encodeURIComponent(gitTag)}/release`
    );

    return got.post(releaseUrl, {
      ...apiOptions,
      body: {tag_name: gitTag, description}, // eslint-disable-line camelcase
    });
  };

  const tagUrl = (gitlabUrl, repoId, gitTag) => {
    return urlJoin(gitlabUrl, encodeURIComponent(repoId), `/tags/${encodeURIComponent(gitTag)}`);
  };

  return {release, links, uploads, tagUrl};
}

module.exports = createGitlabApi;
