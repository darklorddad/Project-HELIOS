# Upstream Compatibility and Development Conventions

## 1. Upstream Management
*   **Remote Name:** `upstream`
*   **URL:** `https://github.com/paul-gauthier/aider.git`
*   **Strategy:** Maintain a "detached downstream" repository. We do not share commit history with upstream to keep our repository clean and avoid the "forked" label on GitHub.

## 2. Syncing with Upstream
When importing new releases or batches of updates from the official Aider repository:
1.  **Fetch:** `git fetch upstream`
2.  **Merge:** `git merge upstream/main --squash --allow-unrelated-histories`
3.  **Protect Identity Files:** Before committing the merge, ensure we do not restore deleted files or overwrite our own:
    *   **README.md:** Keep our version. Run `git checkout HEAD -- README.md`.
    *   **CONTRIBUTING.md:** Do not restore. Run `git rm CONTRIBUTING.md`.
4.  **Commit:** `git commit -m "chore: sync with upstream Aider at [date/version]"`

## 3. Merging Official PRs
To pull a specific Pull Request from the official Aider repository:
1.  **Fetch PR:** `git fetch upstream pull/ID/head:temp-feature-branch`
2.  **Merge:** `git merge temp-feature-branch --squash --allow-unrelated-histories`
3.  **Cleanup:** `git branch -D temp-feature-branch`

## 4. Development Rules
*   **File Layout:** Do not move or rename files inside the `aider/` core directory. Keeping the structure identical to upstream minimises merge conflicts.
*   **Extensions:** Place new features in separate files/modules and import them into the core logic, rather than writing extensive custom code directly inside Aider's original functions.
