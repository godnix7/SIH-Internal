module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/lib/**/*.ts', 'src/services/**/*.ts'],
};
