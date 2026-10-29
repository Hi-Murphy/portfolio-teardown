import { CliError, EXIT } from './exit-codes.ts';

export type Main = (argv: string[]) => number | Promise<number>;

export async function run(main: Main): Promise<void> {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    if (error instanceof CliError) {
      console.error(`error: ${error.message}`);
      process.exitCode = error.code;
      return;
    }

    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exitCode = EXIT.INTERNAL;
  }
}
