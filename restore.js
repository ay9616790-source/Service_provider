const fs = require('fs');
const child_process = require('child_process');

try {
  const originalAppJs = child_process.execSync('git show HEAD:app.js').toString();
  const lines = originalAppJs.split('\n');

  const providerStart = lines.findIndex(l => l.includes('// --- PROVIDER PORTAL / DASHBOARD MOCKUP ---'));
  const authStart = lines.findIndex(l => l.includes('// --- AUTHENTICATION & SESSION MANAGEMENT ---'));

  const providerLines = lines.slice(providerStart, authStart);

  const providerContent = `// Extracted Provider Logic
class ProviderExtension {
${providerLines.join('\n')}
}

Object.getOwnPropertyNames(ProviderExtension.prototype).forEach(name => {
  if (name !== 'constructor') {
    ServifyApp.prototype[name] = ProviderExtension.prototype[name];
  }
});
`;

  fs.writeFileSync('provider.js', providerContent);
  console.log('Restored provider.js successfully!');
} catch(e) {
  console.error(e);
}
