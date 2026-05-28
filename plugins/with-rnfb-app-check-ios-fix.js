const { IOSConfig, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RNFB_APP_BEGIN = /\/\/ @generated begin @react-native-firebase\/app-didFinishLaunchingWithOptions[^\n]*\n\s*FirebaseApp\.configure\(\)\n\/\/ @generated end @react-native-firebase\/app-didFinishLaunchingWithOptions\s*\n?/g;
const RNFB_APP_CHECK_BLOCK = /\/\/ @generated begin @react-native-firebase\/app-check[^\n]*\n\s*RNFBAppCheckModule\.sharedInstance\(\)\n\s*FirebaseApp\.configure\(\)\n\/\/ @generated end @react-native-firebase\/app-check\s*\n?/g;

function ensureFirebaseCoreImport(contents) {
  if (contents.includes('import FirebaseCore')) {
    return contents;
  }

  return contents.replace(/^(internal\s+)?import Expo$/m, '$&\nimport FirebaseCore');
}

function normalizeSwiftAppDelegate(contents) {
  let next = ensureFirebaseCoreImport(contents);

  next = next.replace(RNFB_APP_BEGIN, '');
  next = next.replace(RNFB_APP_CHECK_BLOCK, '');
  next = next.replace(/^\s*RNFBAppCheckModule\.sharedInstance\(\)\s*\n/gm, '');
  next = next.replace(/^\s*FirebaseApp\.configure\(\)\s*\n/gm, '');

  const initBlock = [
    '    RNFBAppCheckModule.sharedInstance()',
    '    FirebaseApp.configure()',
    '',
  ].join('\n');

  const windowLine = /^(\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*)$/m;
  if (windowLine.test(next)) {
    return next.replace(windowLine, `$1\n${initBlock}`);
  }

  return next.replace(/^(\s*factory\.startReactNative\()/m, `${initBlock}$1`);
}

function ensureSwiftBridgingHeader(projectRoot) {
  const iosDir = path.join(projectRoot, 'ios');
  if (!fs.existsSync(iosDir)) {
    return;
  }

  for (const entry of fs.readdirSync(iosDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const headerPath = path.join(iosDir, entry.name, `${entry.name}-Bridging-Header.h`);
    if (!fs.existsSync(headerPath)) {
      continue;
    }

    const contents = fs.readFileSync(headerPath, 'utf8');
    if (!contents.includes('#import <RNFBAppCheckModule.h>')) {
      fs.writeFileSync(headerPath, `${contents.trimEnd()}\n\n#import <RNFBAppCheckModule.h>\n`);
    }
    return;
  }
}

module.exports = function withRnfbAppCheckIosFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const appDelegate = IOSConfig.Paths.getAppDelegate(modConfig.modRequest.projectRoot);

      if (appDelegate.language === 'swift') {
        const contents = fs.readFileSync(appDelegate.path, 'utf8');
        fs.writeFileSync(appDelegate.path, normalizeSwiftAppDelegate(contents));
        ensureSwiftBridgingHeader(modConfig.modRequest.projectRoot);
      }

      return modConfig;
    },
  ]);
};
