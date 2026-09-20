#!/usr/bin/env node
import { createProgram } from '../cli/index.js';
const program = createProgram();
// If run with no arguments, or if invoked as `git bounty` without subcommands,
// show help or open dashboard
if (process.argv.length <= 2) {
    program.outputHelp();
}
else {
    program.parseAsync(process.argv).catch(err => {
        console.error(`\n✖ Fatal error: ${err.message}`);
        process.exit(1);
    });
}
//# sourceMappingURL=git-bounty.js.map