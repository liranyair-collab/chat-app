# CLAUDE.md

This file provides guidance to Claude and other AI assistants when working with this repository.

## Repository Overview

This repository is hosted at `liranyair-collab/Test`. It is currently in its initial state. Update this section as the project evolves to describe:

- **Purpose**: What this project does and the problem it solves
- **Tech stack**: Languages, frameworks, and major libraries in use
- **Architecture**: High-level overview of how the system is structured

---

## Project Structure

As code is added, document the directory layout here. Example structure to update:

```
/
├── src/           # Main source code
├── tests/         # Test files
├── docs/          # Documentation
├── scripts/       # Build and utility scripts
└── CLAUDE.md      # This file
```

---

## Development Workflows

### Getting Started

1. Clone the repository and navigate to the project directory
2. Install dependencies (update this with the actual command once a package manager is chosen)
3. Run the project (update with the actual start command)

### Branch Strategy

- **Main branch**: `main` (or `master`) — always stable and deployable
- **Feature branches**: `feature/<short-description>`
- **Bug fix branches**: `fix/<short-description>`
- **AI-assisted branches**: `claude/<task-description>-<session-id>` — used by Claude for automated tasks

### Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes only
- `refactor`: Code restructuring without behavior change
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependency updates, config changes)

**Examples:**
```
feat(auth): add JWT token refresh logic
fix(api): handle null response from upstream service
docs: update README with setup instructions
```

### Pull Request Guidelines

- Keep PRs focused on a single concern
- Write a clear title and summary explaining *why* the change is needed, not just *what* changed
- Reference related issues with `Closes #<issue-number>` when applicable
- Ensure all tests pass before requesting review

---

## Common Commands

Update this section with actual commands as the project is set up:

```bash
# Install dependencies
# <add command here>

# Run the project
# <add command here>

# Run tests
# <add command here>

# Run linter
# <add command here>

# Format code
# <add command here>

# Build for production
# <add command here>
```

---

## Code Conventions

### General Principles

- **Simplicity first**: Write the minimum code needed to solve the problem. Avoid premature abstraction.
- **Readability**: Code is read far more often than it is written. Optimize for clarity.
- **No dead code**: Remove unused variables, functions, imports, and commented-out code.
- **Consistent naming**: Follow the naming conventions of the language and existing codebase.

### Language-Specific Conventions

Document language-specific style guides, linter configurations, and formatter settings here as they are added to the project.

---

## Testing

### Philosophy

- Write tests for new features and bug fixes
- Tests should document expected behavior, not just verify implementation details
- Prefer tests that test behavior over tests that test implementation

### Running Tests

```bash
# Run all tests
# <add command here>

# Run tests in watch mode
# <add command here>

# Run a single test file
# <add command here>
```

### Test Structure

Document where tests live, naming conventions, and any test utilities or fixtures once established.

---

## AI Assistant Instructions

### What Claude Should Do

- **Read before editing**: Always read a file before modifying it to understand context
- **Minimal changes**: Only change what is necessary to accomplish the task. Avoid unrelated refactoring
- **Follow conventions**: Match the style, naming, and patterns already present in the codebase
- **Run tests**: After making changes, run existing tests to verify nothing is broken
- **Commit clearly**: Write descriptive commit messages explaining the purpose of each change
- **Ask when uncertain**: If requirements are ambiguous, ask for clarification rather than guessing

### What Claude Should Avoid

- Creating new files unless strictly necessary
- Adding comments that restate what the code does (prefer self-documenting code)
- Adding docstrings, type annotations, or error handling beyond what is explicitly requested
- Introducing dependencies without discussing them first
- Pushing to protected branches (`main`, `master`) without explicit permission
- Force-pushing or using destructive git operations
- Skipping pre-commit hooks (`--no-verify`)

### Security

- Never commit secrets, API keys, tokens, or credentials
- Validate all user input at system boundaries
- Avoid common vulnerabilities: SQL injection, XSS, command injection, path traversal
- If a security issue is found during unrelated work, flag it to the user before proceeding

### Working with This Repository

- **Development branch**: `claude/add-claude-documentation-OHcwn`
- **Remote**: `origin` → `http://local_proxy@127.0.0.1:17698/git/liranyair-collab/Test`
- Always push with: `git push -u origin <branch-name>`

---

## Environment and Configuration

Document environment variables, configuration files, and secrets management here as they are introduced. Use a `.env.example` file to document required environment variables without exposing actual values.

---

## Dependency Management

Document the package manager, version pinning strategy, and how to add new dependencies here once the tech stack is decided.

---

## Deployment

Document the deployment process, environments (staging, production), and any infrastructure details here once they are established.

---

## Getting Help

- **Project issues**: Open an issue in the repository
- **Claude Code feedback**: https://github.com/anthropics/claude-code/issues
