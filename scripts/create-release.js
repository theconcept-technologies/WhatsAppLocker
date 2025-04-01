const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function executeCommand(command) {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

function updatePackageVersion(type = 'patch') {
  const packagePath = path.join(process.cwd(), 'package.json');
  const package = require(packagePath);
  const [major, minor, patch] = package.version.split('.').map(Number);
  
  let newVersion;
  switch(type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      throw new Error('Invalid version type. Use: major, minor, or patch');
  }
  
  package.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + '\n');
  return newVersion;
}

function createRelease() {
  // Get version type from command line argument
  const versionType = process.argv[2] || 'patch';
  if (!['major', 'minor', 'patch'].includes(versionType)) {
    console.error('Invalid version type. Use: major, minor, or patch');
    process.exit(1);
  }

  try {
    // Ensure we're on main branch and it's clean
    console.log('🔍 Checking git status...');
    executeCommand('git fetch');
    executeCommand('git checkout main');
    
    // Update version in package.json
    console.log('📝 Updating version...');
    const newVersion = updatePackageVersion(versionType);
    console.log(`✨ New version: ${newVersion}`);

    // Build the extension
    console.log('🏗️  Building extension...');
    executeCommand('npm run build-optimized');
    // executeCommand('npm run build');

    // Create zip file
    console.log('📦 Creating release zip...');
    if (!fs.existsSync('dist')) {
      throw new Error('dist directory not found. Build failed?');
    }
    executeCommand(`cd dist && zip ../whatsapp-locker-v${newVersion}.zip *.exe *.dmg && cd ..`);
    // executeCommand(`cd dist && zip -r ../whatsapp-locker-v${newVersion}.zip . && cd ..`);

    // Commit changes
    console.log('💾 Committing changes...');
    executeCommand('git add .');
    executeCommand(`git commit -m "chore: release version ${newVersion}"`);

    // Create and push tag
    console.log('🏷️  Creating tag...');
    executeCommand(`git tag -a v${newVersion} -m "Version ${newVersion}"`);

    // Push to remote
    console.log('🚀 Pushing to remote...');
    executeCommand('git push origin main');
    executeCommand('git push --tags');

    console.log(`
✅ Release v${newVersion} created successfully!

Next steps:
1. Go to GitHub: ${require('../package.json').repository.url}/releases
2. Click "Draft a new release"
3. Select tag "v${newVersion}"
4. Upload the zip file: whatsapp-locker-v${newVersion}.zip
5. Add release notes
`);

  } catch (error) {
    console.error('❌ Release creation failed:', error);
    process.exit(1);
  }
}

createRelease();