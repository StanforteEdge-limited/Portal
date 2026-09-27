/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/test/e2e'],
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(j|t)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false, isolatedModules: true }],
  },
  transformIgnorePatterns: [
    // Node packages that ship ESM and must be transpiled by ts-jest.
    'node_modules/(?!(@nestjs/bullmq|@nestjs/bull-shared|bullmq|@nestjs/cache-manager|cache-manager|ioredis|@ioredis/commands|node-abort-controller|semver|msgpackr|cron-parser|luxon)/.*)',
  ],
  moduleNameMapper: {
    '^\\$app/(.*)$': '<rootDir>/src/$1',
    '^\\$modules/(.*)$': '<rootDir>/src/modules/$1',
    '^\\$common/(.*)$': '<rootDir>/src/common/$1',
  },
  testEnvironment: 'node',
  testTimeout: 30000,
  maxWorkers: 4,
  slowTestThreshold: 10000,
};