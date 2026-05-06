# Upstream Compatibility and Development Conventions

## 1. Upstream Management
*   **Remote Name:** `upstream`
*   **URL:** `https://github.com/paul-gauthier/aider.git`
*   **Strategy:** Maintain a "detached downstream" repository using a **Vendor Branch** pattern (`vendor-upstream`). We do not share our main commit history with upstream to keep our repository clean and avoid the "forked" label on GitHub, while retaining a clean merge base for updates.

## 2. Syncing with Upstream
When importing new releases or batches of updates from the official Aider repository, use the vendor branch to prevent unrelated history conflicts:
1.  **Update Vendor Branch:**
    ```bash
    git checkout vendor-upstream
    git fetch upstream
    git read-tree -u --reset upstream/main
    git commit -m "chore: vendor drop Aider update [date/version]"
    ```
2.  **Merge into Main:**
    ```bash
    git checkout main
    git merge vendor-upstream
    ```
3.  **Protect Identity and Configuration Files:** Git will typically respect our custom files, but upstream changes to configuration files require manual review before committing the merge:
    *   **README.md:** Keep our version (`git checkout HEAD -- README.md`).
    *   **CONTRIBUTING.md / LICENSE.txt:** Delete / do not restore (repository is currently private).
    *   **.gitignore:** Review conflicts. Keep our custom ignores (like `.venv/`) but append any *new* ignores upstream introduced.
    *   **pyproject.toml:** Carefully merge conflicts. **Always retain HELIOS's `requires-python = ">=3.11"`** (or newer) to protect the `uv` environment. Accept upstream's new dependency additions.
    *   **uv.lock:** Immediately after merging `pyproject.toml`, run `uv sync` to regenerate the lockfile with any new upstream dependencies, and stage the updated `uv.lock` file for the merge commit.

## 3. Merging Official PRs
To pull a specific Pull Request from the official Aider repository, apply it as a patch to avoid importing unrelated commit history:
1.  **Download Patch:** `curl -L https://github.com/paul-gauthier/aider/pull/ID.patch -o feature.patch`
2.  **Apply Patch:** `git apply feature.patch`
3.  **Clean up:** `rm feature.patch`
4.  **Commit:** `git add .` followed by `git commit -m "feat: apply upstream PR #ID"`

## 4. Development Rules
*   **File Layout:** Do not move or rename files inside the `aider/` core directory. Keeping the structure identical to upstream minimises merge conflicts.
*   **Linguistic Style:** Use British English and strictly avoid the use of ampersands.
*   **Extensions:** Place new features in separate files or modules and import them into the core logic, rather than writing extensive custom code directly inside Aider's original functions.

## 5. Dependency and Environment Management
*   **Tooling:** Use `uv` for all dependency management and virtual environment creation. Avoid using standard `pip` or `venv` directly.
*   **Project Metadata:** `pyproject.toml` acts as the source of truth for all project configurations and high-level requirements.
*   **Lockfiles:** The `uv.lock` file must always be committed to version control to guarantee deterministic builds across all environments.
*   **Python Version:** The `.python-version` file must be committed to enforce the baseline Python interpreter (e.g., `3.12`) for the project.
