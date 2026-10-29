const usage = `Usage: pnpm evidence <url> [options]

Captures screenshots and Lighthouse evidence for a URL.`;

if (process.argv.includes('--help')) {
  console.log(usage);
  process.exitCode = 0;
} else {
  console.error(usage);
  process.exitCode = 2;
}
