import test from "ava";
import getProjectPath from "../lib/get-project-path.js";

test("Parse repo id with https URL", (t) => {
  t.is(getProjectPath({ env: {} }, "https://gitlbab.com", "https://gitlab.com/owner/repo.git"), "owner/repo");
  t.is(getProjectPath({ env: {} }, "https://gitlbab.com", "https://gitlab.com/owner/repo"), "owner/repo");
});

test("Parse repo id with git URL", (t) => {
  t.is(getProjectPath({ env: {} }, "https://gitlab.com", "git+ssh://git@gitlab.com/owner/repo.git"), "owner/repo");
  t.is(getProjectPath({ env: {} }, "https://gitlab.com", "git+ssh://git@gitlab.com/owner/repo"), "owner/repo");
});

test("Parse repo id with context in repo URL", (t) => {
  t.is(
    getProjectPath({ env: {} }, "https://gitlbab.com/context", "https://gitlab.com/context/owner/repo.git"),
    "owner/repo"
  );
  t.is(
    getProjectPath({ env: {} }, "https://gitlab.com/context", "git+ssh://git@gitlab.com/context/owner/repo.git"),
    "owner/repo"
  );
});

test("Parse repo id with context not in repo URL", (t) => {
  t.is(getProjectPath({ env: {} }, "https://gitlbab.com/context", "https://gitlab.com/owner/repo.git"), "owner/repo");
  t.is(
    getProjectPath({ env: {} }, "https://gitlab.com/context", "git+ssh://git@gitlab.com/owner/repo.git"),
    "owner/repo"
  );
});

test("Parse repo id with organization and subgroup", (t) => {
  t.is(
    getProjectPath({ env: {} }, "https://gitlbab.com/context", "https://gitlab.com/orga/subgroup/owner/repo.git"),
    "orga/subgroup/owner/repo"
  );
  t.is(
    getProjectPath({ env: {} }, "https://gitlab.com/context", "git+ssh://git@gitlab.com/orga/subgroup/owner/repo.git"),
    "orga/subgroup/owner/repo"
  );
});

test("Get repo id from GitLab CI", (t) => {
  t.is(
    getProjectPath(
      { envCi: { service: "gitlab" }, env: { CI_PROJECT_PATH: "other-owner/other-repo" } },
      "https://gitlbab.com",
      "https://gitlab.com/owner/repo.git"
    ),
    "other-owner/other-repo"
  );
});

test("Ignore CI_PROJECT_PATH if not on GitLab CI", (t) => {
  t.is(
    getProjectPath(
      { envCi: { service: "travis" }, env: { CI_PROJECT_PATH: "other-owner/other-repo" } },
      "https://gitlbab.com",
      "https://gitlab.com/owner/repo.git"
    ),
    "owner/repo"
  );
});
