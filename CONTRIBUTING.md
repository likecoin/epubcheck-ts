# Contributing to epubcheck-ts

Thank you for your interest in contributing to epubcheck-ts!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/likecoin/epubcheck-ts.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Running Tests

```bash
# Run tests in watch mode (recommended during development)
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Code Quality

Before submitting a PR, ensure your code passes all checks:

```bash
# Run all checks
npm run check

# Or run individually:
npm run lint        # ESLint
npm run format:check # Biome formatting
npm run typecheck   # TypeScript
```

### Building

```bash
npm run build
```

## Code Style

- **TypeScript**: Strict mode, explicit return types on public APIs
- **Formatting**: Handled by Biome (run `npm run format` to auto-fix)
- **Linting**: ESLint with typescript-eslint (run `npm run lint:fix` to auto-fix)

### Import Style

```typescript
// Use type imports for types
import type { ValidationMessage } from './types.js';

// Use .js extension for local imports
import { Report } from './core/report.js';
```

## Testing Guidelines

- Write tests for all new functionality
- Co-locate unit tests with source files (`foo.ts` → `foo.test.ts`)
- Place integration tests in `test/integration/`
- Test fixtures go in `test/fixtures/`

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...;
      
      // Act
      const result = ...;
      
      // Assert
      expect(result).toBe(...);
    });
  });
});
```

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add OPF metadata validation`
- `fix: handle empty mimetype file`
- `docs: update API documentation`
- `test: add tests for ZIP reader`
- `refactor: simplify validation context`
- `chore: update dependencies`

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add a clear description of changes
4. Reference any related issues

## Porting from Java EPUBCheck

When porting validation logic from the Java implementation:

1. Study the Java source at `/Users/william/epubcheck`
2. Focus on **what** is being validated, not **how**
3. Preserve message IDs for compatibility
4. Use TypeScript idioms (don't directly translate Java patterns)
5. Add tests that verify the same inputs produce the same errors

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- For AI agents, see [AGENTS.md](./AGENTS.md)

## License

By contributing, you agree that your contributions will be licensed under the BSD-3-Clause License.
