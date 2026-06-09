const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withGradleDirectDownload(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties'
      );

      if (!fs.existsSync(wrapperPath)) {
        return config;
      }

      const original = fs.readFileSync(wrapperPath, 'utf8');
      const updated = original.replace(
        /^distributionUrl=https\\:\/\/services\.gradle\.org\/distributions\/(.+)$/m,
        'distributionUrl=https\\://downloads.gradle.org/distributions/$1'
      );

      if (updated !== original) {
        fs.writeFileSync(wrapperPath, updated);
      }

      return config;
    },
  ]);
};
