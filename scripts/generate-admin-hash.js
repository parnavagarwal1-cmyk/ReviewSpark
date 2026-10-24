/* eslint-disable @typescript-eslint/no-require-imports */
// Helper script to generate an admin password hash
// Usage: node scripts/generate-admin-hash.js
// Then copy the output hash to ADMIN_PASSWORD_HASH in your .env.local

const readline = require('readline');
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Don't echo the password
rl.question('Enter admin password: ', async (password) => {
  if (!password || password.length < 8) {
    console.error('Error: Password must be at least 8 characters.');
    rl.close();
    process.exit(1);
  }

  console.log('Generating hash (this may take a few seconds)…');
  const hash = await bcrypt.hash(password, 12);

  console.log('\n✅ Admin password hash generated successfully!\n');
  console.log('Add this to your .env.local file:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash.replace(/\$/g, '\\$')}`);
  console.log('\n(Note: \\$ escapes dollar signs so Next.js doesn\'t expand them as env vars)');
  console.log('\n⚠️  Keep this hash secure. Never commit it to version control.\n');

  rl.close();
});
