
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!lib/__tests__/**'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
