const { createRunOncePlugin, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * expo-sqlite links to OpenSSL when SQLCipher is enabled, but its dependency is
 * compile-only. Package the matching runtime shared library in Android builds.
 */
function withSqlCipherRuntime(config) {
  return withAppBuildGradle(config, (modConfig) => {
    const dependency = 'implementation("io.github.ronickg:openssl:3.3.2-1")';
    if (!modConfig.modResults.contents.includes(dependency)) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /dependencies \{\r?\n/,
        (match) => `${match}    ${dependency}\n`,
      );
    }
    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withSqlCipherRuntime,
  'yatri-shield-with-sqlcipher-runtime',
  '1.0.0',
);
