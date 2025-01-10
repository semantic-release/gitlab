export default ({ envCi: { service } = {}, env: { CI_PROJECT_ID } }) =>
  service === "gitlab" && CI_PROJECT_ID ? CI_PROJECT_ID : null;
