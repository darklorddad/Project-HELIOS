# Upstream Compatibility and Development Conventions

## 1. Upstream Management
*   **Remote Name:** `upstream`
*   **URL:** `https://github.com/paul-gauthier/aider.git`
*   **Strategy:** A "detached downstream" repository must be maintained using a **Vendor Branch** pattern (`vendor-upstream`). The main commit history is not shared with upstream to keep the repository clean and avoid the "forked" label on GitHub, while retaining a clean merge base for updates.
*   **Initialisation:** The following one-time setup must be run to create the isolated vendor branch:
    ```bash
    git checkout --orphan vendor-upstream
    git fetch upstream
    git read-tree -u --reset upstream/main
    git commit -m "chore: initial vendor drop of Aider [version]"
    git checkout main
    git merge vendor-upstream --allow-unrelated-histories
    ```

## 2. Syncing with Upstream
When importing new releases or batches of updates from the official Aider repository, the vendor branch must be used to prevent unrelated history conflicts:
1.  **Vendor Branch Update:**
    ```bash
    git checkout vendor-upstream
    git fetch upstream
    git read-tree -u --reset upstream/main
    git commit -m "chore: vendor drop Aider update [date/version]"
    ```
2.  **Main Branch Merge:**
    ```bash
    git checkout main
    git merge vendor-upstream
    ```
3.  **Identity and Configuration File Protection:** Git will typically respect custom files, but upstream changes to configuration files require manual review before committing the merge:
    *   **README.md:** The local version must be kept (`git checkout HEAD -- README.md`).
    *   **CONTRIBUTING.md/LICENSE.txt:** These files must be deleted or not restored as the repository is currently private.
    *   **.gitignore:** Conflicts must be reviewed. Custom ignores must be kept but any new ignores introduced by upstream must be appended.
    *   **pyproject.toml:** Conflicts must be merged carefully. New dependency additions from upstream must be accepted.
    *   **uv.lock:** Immediately after merging `pyproject.toml`, `uv sync` must be run to regenerate the lockfile with any new upstream dependencies and the updated `uv.lock` file must be staged for the merge commit.

## 3. Merging Official PRs
To pull a specific Pull Request from the official Aider repository, it must be applied as a patch to avoid importing unrelated commit history:
1.  **Patch Download:** `curl -L https://github.com/paul-gauthier/aider/pull/ID.patch -o feature.patch`
2.  **Patch Application:** `git apply feature.patch` (`git am feature.patch` may be used instead if retention of the original author metadata and commit message is desired).
3.  **Cleanup:** `rm feature.patch`
4.  **Commit Creation:** `git add .` followed by `git commit -m "feat: apply upstream PR #ID"`

*Note: Manually applying patches means that when a future vendor drop includes the exact same Pull Request, Git might flag a merge conflict if upstream slightly modified the code before merging. During conflict resolution, the upstream version must be accepted.*

## 4. Development Rules
*   **File Layout:** Files inside the `aider` core directory must not be moved or renamed. Keeping the structure identical to upstream minimises merge conflicts.
*   **Linguistic Style:** British English must be used and ampersands must be strictly avoided. All documentation and comments must be written in the third person perspective. Oxford commas must not be used and spaces must not be included before or after a slash (`/`).
*   **Extensions:** New features must be placed in separate files or modules and imported into the core logic rather than extensive custom code being written directly inside Aider's original functions.

## 5. Dependency and Environment Management
*   **Tooling:** `uv` must be used for all dependency management and virtual environment creation. The direct use of standard `pip` or `venv` must be avoided.
*   **Project Metadata:** `pyproject.toml` acts as the source of truth for all project configurations and high-level requirements.
*   **Lockfiles:** The `uv.lock` file must always be committed to version control to guarantee deterministic builds across all environments.
*   **Python Version:** The `.python-version` file must be committed to enforce the baseline Python interpreter for the project.
