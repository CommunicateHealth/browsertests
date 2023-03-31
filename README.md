# browsertests
Testing framework for testing Drupal sites using Selenium

## Updating the NPM package

1.  Complete all development work in typical way

2.  **Merge PRs into main branch before continuing**

3.  Decide if update is a major, minor, or patch release — see [Semantic Versioning](https://semver.org/) for guidance

*   major update — 1.0.0 → 2.0.0

*   minor update — 1.0.0 → 1.1.0

*   patch update — 1.0.0 → 1.0.1

4.  `git checkout main`

5.  `git pull`

6.  Bump version with update type (major, minor, patch) by running one of the following:

* `npm version major`
* `npm version minor`
* `npm version patch`

— this will increment `package.json`, `package-lock.json`, and create a new tag with version number in git

7.  Edit `CHANGELOG.md`, documenting new tag

8.  `git add CHANGELOG.md`

9.  `git commit -m "Update CHANGELOG.md"`

10.  `git push`

11.  `npm publish --access public`

*   ⚠️ If you see a 404 from NPM, run **npm login**

12.  done
