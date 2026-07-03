import fs from 'fs';
import path from 'path';

async function editPackageJson(options) {
  const { name, version, description, author, license, targetDir } = options;

  let ohifVersion = '0.0.0';
  try {
    ohifVersion = fs.readFileSync('./version.txt', 'utf8').trim();
  } catch (e) {
    try {
      const versionJson = JSON.parse(fs.readFileSync('./version.json', 'utf8'));
      ohifVersion = versionJson.version || '0.0.0';
    } catch (err) {}
  }

  // read package.json from targetDir
  const dependenciesPath = path.join(targetDir, 'dependencies.json');
  const rawData = fs.readFileSync(dependenciesPath, 'utf8');

  const dataWithOHIFVersion = rawData.replace(/\{LATEST_OHIF_VERSION\}/g, ohifVersion);
  const packageJson = JSON.parse(dataWithOHIFVersion);

  // edit package.json
  const mergedObj = Object.assign(
    {
      name,
      version,
      description,
      author,
      license,
      main: `dist/umd/${name}/index.umd.js`,
      files: ['dist/**', 'public/**', 'README.md'],
    },
    packageJson
  );

  // write package.json back to targetDir
  const writePath = path.join(targetDir, 'package.json');
  fs.writeFileSync(writePath, JSON.stringify(mergedObj, null, 2));

  // remove the dependencies.json file
  fs.unlinkSync(dependenciesPath);
}

export default editPackageJson;
