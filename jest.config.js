/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
          // target: 'es2017', // Optional: ensure SWC's JS output target matches TS
        },
        module: {
          type: 'commonjs',
          strictMode: false,
          noInterop: false,
        },
      },
    ],
    // If you have .js/.jsx files that need transpilation (e.g. from node_modules or plain JS components)
    // you might need babel-jest for them if SWC isn't configured for it or they use Babel-specific features.
    // If your project is pure TypeScript for source files, you might not need this.
    // '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    // Handle module aliases (if you have them in tsconfig.json)
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Add any other Jest options you need below
  // For example, setupFilesAfterEnv for test setup
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
