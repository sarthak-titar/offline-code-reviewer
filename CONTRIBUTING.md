# Contributing to Offline Code Reviewer

First off, thank you for considering contributing to Offline Code Reviewer! It's people like you that make this tool such a great application.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs 🐛

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps which reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots and animated GIFs if possible**
* **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements ✨

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and the proposed behavior**
* **Explain why this enhancement would be useful**

### Pull Requests 🔄

* Fill in the required template
* Follow the [JavaScript Style Guide](#javascript-style-guide)
* End all files with a newline
* Avoid platform-specific code

## Development Setup

### Prerequisites

- Node.js v14.0 or higher
- npm v6.0 or higher
- Ollama (for testing LLM features)
- Git

### Setup Steps

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/offline-code-reviewer.git
   cd offline-code-reviewer
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/sarthak-titar/offline-code-reviewer.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   cd client
   npm install
   cd ..
   ```

5. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

6. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

7. **Start development**
   ```bash
   npm start
   ```

## JavaScript Style Guide

### General Guidelines

- Use semicolons
- Use 2 spaces for indentation
- Use camelCase for variables and functions
- Use PascalCase for classes and components
- Use const by default, let when you need to reassign

### Example

```javascript
// Good
const myVariable = 'value';
const calculateSum = (a, b) => a + b;

class MyComponent {
  constructor(name) {
    this.name = name;
  }
}

// Bad
var myVariable = 'value';
function calculateSum(a,b){return a+b}
```

### React Guidelines

- Use functional components with hooks
- Use meaningful component names
- Keep components focused and single-responsibility
- Add PropTypes or TypeScript types
- Use meaningful state variable names

```javascript
// Good
function CodeReview({ code, onSubmit }) {
  const [analysis, setAnalysis] = useState(null);

  const handleReview = async () => {
    const result = await submitCode(code);
    setAnalysis(result);
  };

  return (
    <div>
      {/* component JSX */}
    </div>
  );
}

export default CodeReview;
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding or updating tests
- **chore**: Changes to build process, dependencies, etc.

### Examples

```bash
git commit -m "feat(server): add code review API endpoint"
git commit -m "fix(ui): correct button alignment issue"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(client): simplify state management"
```

## Testing

Before submitting a PR, please test your changes:

```bash
# Run linting
cd client
npm run lint

# Test the application manually
npm start
```

## Pull Request Process

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**
   - Provide a clear title and description
   - Reference any related issues with `Closes #123`
   - Include screenshots for UI changes
   - List any breaking changes

4. **Pull Request Template**
   ```markdown
   ## Description
   Brief description of the changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   How to test these changes

   ## Checklist
   - [ ] My code follows the style guidelines
   - [ ] I have performed a self-review
   - [ ] I have commented my code
   - [ ] Documentation is updated
   - [ ] No new warnings generated
   - [ ] Tests pass locally
   ```

## Additional Notes

### Issue and Pull Request Labels

* `bug` - Something isn't working
* `enhancement` - New feature or request
* `documentation` - Improvements or additions to documentation
* `good first issue` - Good for newcomers
* `help wanted` - Extra attention is needed
* `question` - Further information is requested
* `wontfix` - This will not be worked on

## Getting Help

- Check the [README.md](README.md) for documentation
- Browse existing [issues](https://github.com/sarthak-titar/offline-code-reviewer/issues)
- Ask questions in discussions

## License

By contributing, you agree that your contributions will be licensed under its ISC License.

---

Thank you for contributing! 🎉
