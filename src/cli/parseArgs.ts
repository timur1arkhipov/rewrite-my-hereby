import commandLineUsage from "command-line-usage";
import minimist from "minimist";

import type { TaskFormat } from "./formatTasks.js";

interface CLIOptions {
    readonly help: boolean;
    readonly run: readonly string[];
    readonly terebyfile: string | undefined;
    readonly printTasks: TaskFormat | undefined;
    readonly version: boolean;
}

export function parseArgs(argv: string[]): CLIOptions {
    let parseUnknownAsTask = true;
    const options = minimist(argv, {
        "--": true,
        string: ["terebyfile"],
        boolean: ["tasks", "tasks-simple", "help", "version"],
        alias: {
            "h": "help",
            "T": "tasks",
        },
        unknown: (name) => parseUnknownAsTask && (parseUnknownAsTask = !name.startsWith("-")),
    });

    return {
        help: options["help"],
        run: options._,
        terebyfile: options["terebyfile"],
        printTasks: options["tasks"] ? "normal" : (options["tasks-simple"] ? "simple" : undefined),
        version: options["version"],
    };
}

export function getUsage(): string {
    const usage = commandLineUsage([
        {
            header: "tereby",
            content: "A simple task runner.",
        },
        {
            header: "Synopsis",
            content: "$ tereby <task>",
        },
        {
            header: "Options",
            optionList: [
                {
                    name: "help",
                    description: "Display this usage guide.",
                    alias: "h",
                    type: Boolean,
                },
                {
                    name: "terebyfile",
                    description: "A path to a Terebyfile. Optional.",
                    type: String,
                    defaultOption: true,
                    typeLabel: "{underline path}",
                },
                {
                    name: "tasks",
                    description: "Print a listing of the available tasks.",
                    alias: "T",
                    type: Boolean,
                },
                {
                    name: "version",
                    description: "Print the current tereby version.",
                    type: Boolean,
                },
            ],
        },
        {
            header: "Example usage",
            content: [
                "$ tereby build",
                "$ tereby build lint",
                "$ tereby test --skip someTest --lint=false",
                "$ tereby --tasks",
            ],
        },
    ]);

    return usage;
}
