const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');
const lines = code.split('\n');

const customerStart = lines.findIndex(l => l.includes('// --- CUSTOMER DASHBOARD & MOCK CHAT ---'));
const providerStart = lines.findIndex(l => l.includes('// --- PROVIDER PORTAL / DASHBOARD MOCKUP ---'));
const authStart = lines.findIndex(l => l.includes('// --- AUTHENTICATION & SESSION MANAGEMENT ---'));

if (customerStart === -1 || providerStart === -1 || authStart === -1) {
    console.error("Could not find boundaries!");
    process.exit(1);
}

const customerLines = lines.slice(customerStart, providerStart);
const providerLines = lines.slice(providerStart, authStart);

const appLines = [...lines.slice(0, customerStart), ...lines.slice(authStart)];

const customerContent = `// Extracted Customer Logic
class CustomerExtension {
${customerLines.join('\n')}
}

Object.getOwnPropertyNames(CustomerExtension.prototype).forEach(name => {
  if (name !== 'constructor') {
    ServifyApp.prototype[name] = CustomerExtension.prototype[name];
  }
});
`;

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

fs.writeFileSync('customer.js', customerContent);
fs.writeFileSync('provider.js', providerContent);
fs.writeFileSync('app.js', appLines.join('\n'));
console.log('Extraction complete!');
