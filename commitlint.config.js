// Conventional Commits, enforced on commit-msg via lefthook.
// Matches the history: feat / fix / docs / style / refactor / perf / test / build / ci / chore.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Prose and trailers (e.g. Co-Authored-By) wrap freely — don't gate on line length.
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
  },
};
