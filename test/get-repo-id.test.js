const test = require('ava');
const getRepoId = require('../lib/get-repo-id');

test('Parse repo id with https URL', (t) => {
  t.is(getRepoId({env: {}}, 'https://gitlbab.com', 'https://gitlab.com/owner/repo.git'), 'owner/repo');
  t.is(getRepoId({env: {}}, 'https://gitlbab.com', 'https://gitlab.com/owner/repo'), 'owner/repo');
});

test('Parse repo id with git URL', (t) => {
  t.is(getRepoId({env: {}}, 'https://gitlab.com', 'git+ssh://git@gitlab.com/owner/repo.git'), 'owner/repo');
  t.is(getRepoId({env: {}}, 'https://gitlab.com', 'git+ssh://git@gitlab.com/owner/repo'), 'owner/repo');
});

test('Parse repo id with context in repo URL', (t) => {
  t.is(getRepoId({env: {}}, 'https://gitlbab.com/context', 'https://gitlab.com/context/owner/repo.git'), 'owner/repo');
  t.is(
    getRepoId({env: {}}, 'https://gitlab.com/context', 'git+ssh://git@gitlab.com/context/owner/repo.git'),
    'owner/repo'
  );
});

test('Parse repo id with context not in repo URL', (t) => {
  t.is(getRepoId({env: {}}, 'https://gitlbab.com/context', 'https://gitlab.com/owner/repo.git'), 'owner/repo');
  t.is(getRepoId({env: {}}, 'https://gitlab.com/context', 'git+ssh://git@gitlab.com/owner/repo.git'), 'owner/repo');
});

test('Parse repo id with organization and subgroup', (t) => {
  t.is(
    getRepoId({env: {}}, 'https://gitlbab.com/context', 'https://gitlab.com/orga/subgroup/owner/repo.git'),
    'orga/subgroup/owner/repo'
  );
  t.is(
    getRepoId({env: {}}, 'https://gitlab.com/context', 'git+ssh://git@gitlab.com/orga/subgroup/owner/repo.git'),
    'orga/subgroup/owner/repo'
  );
});

test('Get repo id from GitLab CI', (t) => {
  t.is(
    getRepoId(
      {envCi: {service: 'gitlab'}, env: {CI_PROJECT_PATH: 'other-owner/other-repo'}},
      'https://gitlbab.com',
      'https://gitlab.com/owner/repo.git'
    ),
    'other-owner/other-repo'
  );
});

test('Ignore CI_PROJECT_PATH if not on GitLab CI', (t) => {
  t.is(
    getRepoId(
      {envCi: {service: 'travis'}, env: {CI_PROJECT_PATH: 'other-owner/other-repo'}},
      'https://gitlbab.com',
      'https://gitlab.com/owner/repo.git'
    ),
    'owner/repo'
  );
});
