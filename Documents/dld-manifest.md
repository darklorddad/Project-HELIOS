### darklorddad's Manifest

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

To install Playwright
```C:\Python312\python.exe -m playwright install --with-deps chromium```

To upgrade pip
```python.exe -m pip install --upgrade pip```

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### Aider

To upgrade Aider
```C:\Python312\python.exe -m pip install --upgrade --upgrade-strategy only-if-needed aider-chat```

**Aider commands:**
aider --model openrouter/google/gemini-2.5-pro --edit-format diff-fenced --chat-language British-English --cache-prompt --no-stream --no-attribute-author --no-attribute-committer --no-attribute-co-authored-by --add-gitignore-files --timeout 60 --multiline --dark-mode --check-update --analytics-disable

aider --model deepseek/deepseek-reasoner --edit-format diff --chat-language British-English --cache-prompt --no-stream --no-attribute-author --no-attribute-committer --no-attribute-co-authored-by --add-gitignore-files --timeout 60 --multiline --dark-mode --check-update --analytics-disable --api-key deepseek=sk-db1782a4ae4d49009e582872fca10f97

aider --model deepseek/deepseek-chat --edit-format diff --chat-language British-English --cache-prompt --no-stream --no-attribute-author --no-attribute-committer --no-attribute-co-authored-by --add-gitignore-files --timeout 60 --multiline --dark-mode --check-update --analytics-disable --api-key deepseek=sk-db1782a4ae4d49009e582872fca10f97

aider --model openrouter/google/gemini-3-pro-preview --edit-format diff-fenced --chat-language British-English --cache-prompt --no-stream --no-attribute-author --no-attribute-committer --no-attribute-co-authored-by --add-gitignore-files --timeout 60 --multiline --dark-mode --check-update --analytics-disable

C:\Users\darklorddad\Downloads\Project-HELIOS\engine\venv\Scripts\aider.exe --model openrouter/google/gemini-3-pro-preview --edit-format diff-fenced --chat-language British-English --cache-prompt --no-stream --no-attribute-author --no-attribute-committer --no-attribute-co-authored-by --add-gitignore-files --timeout 60 --multiline --dark-mode --check-update --analytics-disable

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### Git Commands

**Remove the File from the Git Repository:**

For a single file
```git rm --cached <file_name>```
    
For a directory
```git rm --cached -r <directory_name>```

**History**

Export with summary of changes
```git log --all --pretty="%n### %s%n**Author:** %an%n**Date:** %ad%n%n%b" --stat > "C:\Users\darklorddad\Downloads\git-history-summary.md"```

Export with full code changes
```git log --all --pretty="%n### %s%n**Author:** %an%n**Date:** %ad%n%n%b" --stat -p > "C:\Users\darklorddad\Downloads\git-history-full-patch.md"```

Author-only summary export
```git log --all --author="darklorddad" --pretty="%n### %s%n**Author:** %an%n**Date:** %ad%n%n%b" --stat > "C:\Users\darklorddad\Downloads\git-history-summary-author-only.md"```

Author-only full export
```git log --all --author="darklorddad" --pretty="%n### %s%n**Author:** %an%n**Date:** %ad%n%n%b" --stat -p > "C:\Users\darklorddad\Downloads\git-history-full-patch-author-only.md"```

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### Discussion Report Document Template

Write a report based on this discussion

Format:

### (Title)

Date: (DD)(st, nd, rd, th) of (Month), (YYYY)

---

### (Numbering like 1. 2. 3. 1.1. 1.2. 1.3.) (Heading - Executive Summary)

(Content)

---

### (Numbering like 1. 2. 3. 1.1. 1.2. 1.3.) (Heading) 

(Content)

#### (Numbering like 1. 2. 3. 1.1. 1.2. 1.3.) (Sub-heading) 

(Content)

#### (Numbering like 1. 2. 3. 1.1. 1.2. 1.3.) (Sub-heading) 

(Content)

---

(Add more heading as needed)

---

### (Numbering like 1. 2. 3. 1.1. 1.2. 1.3.) (Heading - Conclusion)

(Content)

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------




