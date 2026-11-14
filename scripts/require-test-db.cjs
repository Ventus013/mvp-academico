require('dotenv/config');
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) {
  console.error('Configure TEST_DATABASE_URL com um banco descartável cujo nome termine em _test.');
  process.exit(1);
}
