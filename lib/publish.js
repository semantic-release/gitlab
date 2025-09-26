import { readFileSync } from "fs";
import pathlib from "path";
import fs from "fs-extra";
import { isPlainObject, template } from "lodash-es";
import { FormData } from "formdata-node";
import { fileFromPath } from "formdata-node/file-from-path";
import urlJoin from "url-join";
import got from "got";
import _debug from "debug";
const debug = _debug("semantic-release:gitlab");
import resolveConfig from "./resolve-config.js";
import getAssets from "./glob-assets.js";
import { RELEASE_NAME } from "./definitions/constants.js";
import getProjectContext from "./get-project-context.js";

const isUrlScheme = (value) => /^(https|http|ftp):\/\//.test(value);

export default async (pluginConfig, context) => {
  const {
    cwd,
    options: { repositoryUrl },
    nextRelease: { gitTag, gitHead, notes, version },
    logger,
  } = context;
  const { gitlabToken, gitlabUrl, gitlabApiUrl, assets, milestones, proxy, retryLimit, retryStatusCodes } =
    resolveConfig(pluginConfig, context);
  const assetsList = [];
  const { projectPath, projectApiUrl } = getProjectContext(context, gitlabUrl, gitlabApiUrl, repositoryUrl);

  const encodedGitTag = encodeURIComponent(gitTag);
  const apiOptions = {
    headers: {
      "PRIVATE-TOKEN": gitlabToken,
    },
    hooks: {
      beforeError: [
        (error) => {
          const { response } = error;
          if (response?.body && response.headers["content-type"] === "application/json") {
            const parsedBody = JSON.parse(response.body);
            if (parsedBody.message) {
              error.message = `Response code ${response.statusCode} (${parsedBody.message})`;
            }
          }
          return error;
        },
      ],
    },
    retry: { limit: retryLimit, statusCodes: retryStatusCodes },
  };

  debug("projectPath: %o", projectPath);
  debug("release name: %o", gitTag);
  debug("release ref: %o", gitHead);
  debug("milestones: %o", milestones);

  if (assets && assets.length > 0) {
    const templatedAssets = assets.map((asset) => {
      if (isPlainObject(asset)) {
        const templatedAsset = { ...asset };
        if (asset.path) {
          templatedAsset.path = Array.isArray(asset.path)
            ? asset.path.map((pattern) => template(pattern)(context))
            : template(asset.path)(context);
        }
        templatedAsset.url = asset.url ? template(asset.url)(context) : asset.url;
        templatedAsset.label = asset.label ? template(asset.label)(context) : asset.label;
        templatedAsset.type = asset.type ? template(asset.type)(context) : asset.type;
        templatedAsset.filepath = asset.filepath ? template(asset.filepath)(context) : asset.filepath;
        templatedAsset.target = asset.target ? template(asset.target)(context) : asset.target;
        templatedAsset.status = asset.status ? template(asset.status)(context) : asset.status;
        templatedAsset.packageName = asset.packageName ? template(asset.packageName)(context) : asset.packageName;
        return templatedAsset;
      } else if (Array.isArray(asset)) {
        // Handle array of glob patterns
        return asset.map((pattern) => template(pattern)(context));
      } else {
        // String asset path
        return template(asset)(context);
      }
    });

    // Skip glob if url is provided
    const urlAssets = templatedAssets.filter((asset) => asset.url);
    debug("url assets: %o", urlAssets);
    const globbedAssets = await getAssets(
      context,
      templatedAssets.filter((asset) => !asset.url)
    );
    debug("globbed assets: %o", globbedAssets);
    const allAssets = [...urlAssets, ...globbedAssets];
    debug("all assets: %o", allAssets);

    await Promise.all(
      allAssets.map(async (asset) => {
        const path = isPlainObject(asset) ? asset.path : asset;

        if (asset.url) {
          assetsList.push({ label: asset.label, rawUrl: asset.url, type: asset.type, filepath: asset.filepath });
          debug("use link from release setting: %s", asset.url);
        } else {
          const file = pathlib.resolve(cwd, path);

          let fileStat;

          try {
            fileStat = await fs.stat(file);
          } catch {
            logger.error("The asset %s cannot be read, and will be ignored.", path);
            return;
          }

          if (!fileStat || !fileStat.isFile()) {
            logger.error("The asset %s is not a file, and will be ignored.", path);
            return;
          }

          debug("file path: %o", path);
          debug("file label: %o", asset.label);
          debug("file type: %o", asset.type);
          debug("file filepath: %o", asset.filepath);
          debug("file target: %o", asset.target);
          debug("file status: %o", asset.status);
          debug("package name: %o", asset.packageName);

          let uploadEndpoint;
          let response;

          if (asset.target === "generic_package") {
            const finalLabel = asset.label ?? pathlib.basename(file);
            const packageName = asset.packageName ?? "release";
            // Upload generic packages
            const encodedVersion = encodeURIComponent(version);
            const encodedPackageName = encodeURIComponent(packageName);
            const encodedLabel = encodeURIComponent(finalLabel);
            // https://docs.gitlab.com/ee/user/packages/generic_packages/#publish-a-package-file
            uploadEndpoint = urlJoin(
              projectApiUrl,
              `packages/generic/${encodedPackageName}/${encodedVersion}/${encodedLabel}?${
                asset.status ? `status=${asset.status}&` : ""
              }select=package_file`
            );

            debug("PUT-ing the file %s to %s", file, uploadEndpoint);

            try {
              response = await got.put(uploadEndpoint, { ...apiOptions, ...proxy, body: readFileSync(file) }).json();
            } catch (error) {
              logger.error("An error occurred while uploading %s to the GitLab generics package API:\n%O", file, error);
              throw error;
            }

            // https://docs.gitlab.com/ee/user/packages/generic_packages/#download-package-file
            const url = urlJoin(
              projectApiUrl,
              `packages/generic/${encodedPackageName}/${encodedVersion}/${encodedLabel}`
            );

            assetsList.push({ label: finalLabel, alt: packageName, url, type: "package", filepath: asset.filepath });

            logger.log("Uploaded file: %s (%s)", url, response.file.url);
          } else {
            // Handle normal assets
            uploadEndpoint = urlJoin(projectApiUrl, "uploads");

            debug("POST-ing the file %s to %s", file, uploadEndpoint);

            try {
              const form = new FormData();
              form.append("file", await fileFromPath(file));
              response = await got.post(uploadEndpoint, { ...apiOptions, ...proxy, body: form }).json();
            } catch (error) {
              logger.error("An error occurred while uploading %s to the GitLab project uploads API:\n%O", file, error);
              throw error;
            }

            const { alt, full_path } = response;
            const url = urlJoin(gitlabUrl, full_path);

            assetsList.push({ label: asset.label, alt, url, type: asset.type, filepath: asset.filepath });

            logger.log("Uploaded file: %s", url);
          }
        }
      })
    );
  }

  debug("Create a release for git tag %o with commit %o", gitTag, gitHead);

  const createReleaseEndpoint = urlJoin(projectApiUrl, "releases");

  const json = {
    /* eslint-disable camelcase */
    tag_name: gitTag,
    description: notes && notes.trim() ? notes : gitTag,
    milestones,
    assets: {
      links: assetsList.map(({ label, alt, url, type, filepath, rawUrl }) => {
        return {
          name: label || alt,
          url: rawUrl || (isUrlScheme(url) ? url : urlJoin(gitlabUrl, projectPath, url)),
          link_type: type,
          filepath,
        };
      }),
    },
    /* eslint-enable camelcase */
  };

  debug("POST-ing the following JSON to %s:\n%s", createReleaseEndpoint, JSON.stringify(json, null, 2));

  try {
    await got.post(createReleaseEndpoint, {
      ...apiOptions,
      ...proxy,
      json,
    });
  } catch (error) {
    logger.error("An error occurred while making a request to the GitLab release API:\n%O", error);
    throw error;
  }

  logger.log("Published GitLab release: %s", gitTag);

  const releaseUrl = urlJoin(gitlabUrl, projectPath, `/-/releases/${encodedGitTag}`);

  return { name: RELEASE_NAME, url: releaseUrl };
};
