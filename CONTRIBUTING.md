# Contributing to Somali Exchange Rates

Thank you for your interest in contributing to the Somali Exchange Rates project! This document provides guidelines and information for contributors.

## 🌟 Ways to Contribute

- 🐛 **Bug Reports**: Report issues you encounter
- 💡 **Feature Requests**: Suggest new features or improvements
- 🔧 **Code Contributions**: Submit bug fixes or new features
- 📚 **Documentation**: Improve documentation and examples
- 🌍 **Localization**: Help with translations (Somali, Arabic, other languages)
- 🧪 **Testing**: Help test new features and report issues

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/somali-exchange-rates.git
   cd somali-exchange-rates
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the Project**
   ```bash
   npm run build
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

6. **Test CLI Commands**
   ```bash
   node dist/cli.js rates
   node dist/cli.js quote USD SOS 100
   ```

## 🏗️ Project Structure

```
src/
├── __tests__/          # Test files
├── providers/          # Exchange rate providers
├── data/              # Seed data and configurations
├── alerts.ts          # Alert management
├── analysis.ts        # Market analysis
├── cache.ts           # Caching system
├── cli.ts             # CLI interface
├── config.ts          # Configuration management
├── export.ts          # Export functionality
├── historical.ts      # Historical data
├── index.ts           # Main API
├── localization.ts    # Multi-language support
├── realtime.ts        # WebSocket streaming
├── transfer-fees.ts   # Transfer fee calculator
├── tui.ts             # Terminal UI
├── types.ts           # TypeScript definitions
└── utils.ts           # Utility functions
```

## 📝 Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting and style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and small

### Commit Messages

Use conventional commit format:
```
type(scope): description

feat(cli): add new export command
fix(alerts): resolve email notification issue
docs(readme): update installation instructions
test(providers): add tests for fixer provider
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`

### Testing

- Write tests for all new features
- Maintain or improve test coverage
- Test both success and error scenarios
- Include integration tests for CLI commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test src/__tests__/alerts.test.ts
```

### Documentation

- Update README.md for new features
- Add JSDoc comments for new functions
- Update CLI help text
- Include examples in documentation

## 🌍 Localization Contributions

We welcome translations and localization improvements:

### Adding New Languages

1. Add language code to `src/types.ts`:
   ```typescript
   export type Language = "en" | "so" | "ar" | "sw"; // Add Swahili
   ```

2. Add translations to `src/localization.ts`:
   ```typescript
   'currency.USD': {
     en: 'US Dollar',
     so: 'Doolar Maraykan',
     ar: 'دولار أمريكي',
     sw: 'Dola ya Marekani' // Add Swahili
   }
   ```

3. Test the new language:
   ```bash
   node dist/cli.js config language sw
   node dist/cli.js quote USD SOS 100
   ```

### Improving Existing Translations

- Review translations in `src/localization.ts`
- Ensure cultural appropriateness
- Test formatting with the new translations

## 🔧 Adding New Features

### Exchange Rate Providers

1. Create provider class in `src/providers/`:
   ```typescript
   export class NewProvider implements Provider {
     name = "new-provider";
     priority = 4;
     
     async fetchRatesSOS(): Promise<RateTable> {
       // Implementation
     }
   }
   ```

2. Add to provider manager
3. Add tests
4. Update documentation

### CLI Commands

1. Add command handler in `src/cli.ts`
2. Update help text
3. Add tests
4. Update README

### Transfer Providers

1. Add fee structure to `src/transfer-fees.ts`
2. Test calculations
3. Update provider list in CLI help

## 🧪 Testing Guidelines

### Unit Tests

- Test individual functions and classes
- Mock external dependencies
- Test error conditions
- Use descriptive test names

### Integration Tests

- Test CLI commands end-to-end
- Test provider integrations
- Test configuration scenarios

### Manual Testing

Before submitting:
```bash
# Test basic functionality
npm run build
node dist/cli.js rates
node dist/cli.js quote USD SOS 100

# Test new features
node dist/cli.js your-new-command

# Test error handling
node dist/cli.js invalid-command
```

## 📋 Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following guidelines
   - Add tests
   - Update documentation

3. **Test Thoroughly**
   ```bash
   npm test
   npm run build
   # Manual testing
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Fill PR Template**
   - Describe changes
   - Link related issues
   - Add testing notes

## 🐛 Bug Reports

When reporting bugs, include:

- **Environment**: OS, Node.js version, package version
- **Command**: Exact command that failed
- **Expected vs Actual**: What should happen vs what happened
- **Logs**: Error messages and stack traces
- **Configuration**: Relevant settings

## 💡 Feature Requests

For feature requests, provide:

- **Use Case**: Who needs this and why
- **Description**: Clear explanation of the feature
- **Examples**: How it would work
- **Priority**: How important it is

## 🏷️ Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements to docs
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `localization`: Translation related
- `provider`: Exchange rate provider related
- `cli`: Command line interface related

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Email**: For security issues or private matters

## 🎉 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to the Somali Exchange Rates project! Your contributions help make financial tools more accessible to the Somali community worldwide. 🇸🇴