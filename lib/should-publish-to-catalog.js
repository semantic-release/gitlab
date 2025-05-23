import got from "got";

export default async ({ gitlabGraphQlApiUrl, gitlabToken, projectPath, publishToCatalog }, { logger }) => {
  if (publishToCatalog !== undefined) {
    return publishToCatalog;
  }
  try {
    const query = `
      query {
        project(fullPath: "${projectPath}") {
          isCatalogResource
        }
      }
    `;
    const response = await got
      .post(gitlabGraphQlApiUrl, {
        headers: {
          "Private-Token": gitlabToken,
          "Content-Type": "application/json",
          Accept: "application/graphql-response+json",
        },
        json: { query },
      })
      .json();
    return !!response.data.project.isCatalogResource;
  } catch (error) {
    logger.error("Error making GraphQL request:", error.message);
    throw error;
  }
};
