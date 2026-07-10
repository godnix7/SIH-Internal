const { createRunOncePlugin, withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = '// yatri-shield: SQLCipher OpenSSL runtime';

/**
 * expo-sqlite compiles SQLCipher against OpenSSL but declares the dependency
 * `compileOnly`, and the `io.github.ronickg:openssl` artifact ships only a
 * `prefab/` tree (link-time headers and libs) rather than a packaged `jni/`
 * directory. Neither path puts `libcrypto.so` in the APK, so `libexpo-sqlite.so`
 * -- which carries a DT_NEEDED entry for it -- fails to load at runtime and the
 * encrypted outbox cannot be opened.
 *
 * Extract the prefab `libcrypto.so` for each ABI into a jniLibs source directory
 * so AGP packages it. AGP's abiFilters drop the ABIs a given build excludes.
 */
const GRADLE_SNIPPET = `
${MARKER}
configurations {
    opensslRuntime { transitive = false }
}

dependencies {
    opensslRuntime "io.github.ronickg:openssl:3.3.2-1@aar"
}

def opensslJniDir = new File(buildDir, "openssl-jni")

def extractOpensslJniLibs = tasks.register("extractOpensslJniLibs", Copy) {
    from({ zipTree(configurations.opensslRuntime.singleFile) }) {
        include "prefab/modules/crypto/libs/android.*/libcrypto.so"
        eachFile { details ->
            def abi = details.relativePath.segments[4].replace("android.", "")
            details.relativePath = new RelativePath(true, abi, "libcrypto.so")
        }
    }
    includeEmptyDirs = false
    into opensslJniDir
}

android {
    sourceSets {
        main {
            jniLibs.srcDirs += opensslJniDir
        }
    }
}

tasks.named("preBuild").configure { dependsOn(extractOpensslJniLibs) }
`;

function withSqlCipherRuntime(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (!modConfig.modResults.contents.includes(MARKER)) {
      modConfig.modResults.contents += GRADLE_SNIPPET;
    }
    return modConfig;
  });
}

module.exports = createRunOncePlugin(
  withSqlCipherRuntime,
  'yatri-shield-with-sqlcipher-runtime',
  '1.0.0',
);
