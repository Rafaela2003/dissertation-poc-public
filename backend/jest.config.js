// Jest configuration for the backend tests

export default {
  testEnvironment: "node",
  transform: {},
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/test/**/*.test.js"],
  testTimeout: 30000, // 30 seconds for individual tests
  collectCoverageFrom: ["src/**/*.js", "!src/server.js"],
  coverageDirectory: "coverage",
  verbose: true,
};
