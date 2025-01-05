import path from "node:path";
import { performance } from "node:perf_hooks";
import { types } from "node:util";

import pc from "picocolors";

import type { Task } from "../index.js";
import { formatTasks } from "./formatTasks.js";
import { findTerebyfile, type Terebyfile, loadTerebyfile } from "./loadTerebyfile.js";
import { getUsage, parseArgs } from "./parseArgs.js";
import { reexec } from "./reexec.js";
import { Runner } from "./runner.js";
import { type D, UserError } from "./utils.js";

export async function main(d: D) {
    try {
        await mainWorker(d);
    } catch (e) {
        if (e instanceof UserError) {
            d.error(`${pc.red("Error")}: ${e.message}`);
        } else if (types.isNativeError(e) && e.stack) {
            d.error(e.stack);
        } else {
            d.error(`${e}`);
        }
        d.setExitCode(1);
    }
}

async function mainWorker(d: D) {
    const args = parseArgs(d.argv.slice(2));

    if (args.help) {
        d.log(getUsage());
        return;
    }

    const terebyfilePath = path.resolve(d.cwd(), args.terebyfile ?? findTerebyfile(d.cwd()));

    if (await reexec(terebyfilePath)) return;

    if (args.version) {
        d.log(`tereby ${d.version()}`);
        return;
    }

    d.chdir(path.dirname(terebyfilePath));

    const terebyfile = await loadTerebyfile(terebyfilePath);

    if (args.printTasks) {
        d.log(formatTasks(args.printTasks, terebyfile.tasks.values(), terebyfile.defaultTask));
        return;
    }

    const tasks = await selectTasks(d, terebyfile, terebyfilePath, args.run);
    const taskNames = tasks.map((task) => pc.blue(task.options.name)).join(", ");
    d.log(`Using ${pc.yellow(d.simplifyPath(terebyfilePath))} to run ${taskNames}`);

    const start = performance.now();

    let errored = false;
    try {
        const runner = new Runner(d);
        await runner.runTasks(...tasks);
    } catch {
        errored = true;
        // We will have already printed some message here.
        // Set the error code and let the process run to completion,
        // so we don't end up with an unflushed output.
        d.setExitCode(1);
    } finally {
        const took = performance.now() - start;
        d.log(`Completed ${taskNames}${errored ? pc.red(" with errors") : ""} in ${d.prettyMilliseconds(took)}`);
    }
}

// Exported for testing.
export async function selectTasks(
    d: Pick<D, "simplifyPath">,
    terebyfile: Terebyfile,
    terebyfilePath: string,
    taskNames: readonly string[],
): Promise<readonly Task[]> {
    if (taskNames.length === 0) {
        if (terebyfile.defaultTask) return [terebyfile.defaultTask];
        throw new UserError(
            `No default task has been exported from ${d.simplifyPath(terebyfilePath)}; please specify a task name.`,
        );
    }

    const tasks: Task[] = [];

    for (const name of taskNames) {
        const task = terebyfile.tasks.get(name);
        if (!task) {
            let message = `Task "${name}" does not exist or is not exported from ${d.simplifyPath(terebyfilePath)}.`;

            const { closest, distance } = await import("fastest-levenshtein");

            const candidate = closest(name, [...terebyfile.tasks.keys()]);
            if (distance(name, candidate) < name.length * 0.4) {
                message += ` Did you mean "${candidate}"?`;
            }

            throw new UserError(message);
        }
        tasks.push(task);
    }

    return tasks;
}
