import path from "node:path";
import { fileURLToPath } from "node:url";

import test from "ava";

import { main, selectTasks } from "../../cli/index.js";
import { loadTerebyfile } from "../../cli/loadTerebyfile.js";
import { type D, UserError } from "../../cli/utils.js";
import { mock } from "../__helpers__/index.js";

const fixturesPath = fileURLToPath(new URL("__fixtures__", import.meta.url));

function fakeSimplifyPath(p: string): string {
    return `~/simplified/${path.basename(p)}`;
}

test("selectTasks single", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "Terebyfile.mjs");
    const terebyfile = await loadTerebyfile(terebyfilePath);

    const tasks = await selectTasks({ simplifyPath: fakeSimplifyPath }, terebyfile, terebyfilePath, ["runSomeProgram"]);
    t.is(tasks.length, 1);
    t.is(tasks[0].options.name, "runSomeProgram");
});

test("selectTasks multiple", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "Terebyfile.mjs");
    const terebyfile = await loadTerebyfile(terebyfilePath);
    const requested = [
        "runSomeProgram",
        "buildCompiler",
    ];

    const tasks = await selectTasks({ simplifyPath: fakeSimplifyPath }, terebyfile, terebyfilePath, requested);
    t.is(tasks.length, 2);
    t.is(tasks[0].options.name, requested[0]);
    t.is(tasks[1].options.name, requested[1]);
});

test("selectTasks default", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "Terebyfile.mjs");
    const terebyfile = await loadTerebyfile(terebyfilePath);

    const tasks = await selectTasks({ simplifyPath: fakeSimplifyPath }, terebyfile, terebyfilePath, []);
    t.is(tasks.length, 1);
    t.is(tasks[0].options.name, "runSomeProgram");
});

test("selectTasks missing", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "Terebyfile.mjs");
    const terebyfile = await loadTerebyfile(terebyfilePath);

    await t.throwsAsync(() => selectTasks({ simplifyPath: fakeSimplifyPath }, terebyfile, terebyfilePath, ["oops"]), {
        instanceOf: UserError,
        message: 'Task "oops" does not exist or is not exported from ~/simplified/Terebyfile.mjs.',
    });
});

test("selectTasks missing did you mean", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "Terebyfile.mjs");
    const terebyfile = await loadTerebyfile(terebyfilePath);

    await t.throwsAsync(
        () => selectTasks({ simplifyPath: fakeSimplifyPath }, terebyfile, terebyfilePath, ["buildcompiler"]),
        {
            instanceOf: UserError,
            message:
                'Task "buildcompiler" does not exist or is not exported from ~/simplified/Terebyfile.mjs. Did you mean "buildCompiler"?',
        },
    );
});

test("selectTasks missing default", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "noDefault.mjs");
    const terebyfile = await loadTerebyfile(terebyfilePath);

    await t.throwsAsync(() => selectTasks({ simplifyPath: fakeSimplifyPath }, terebyfile, terebyfilePath, []), {
        instanceOf: UserError,
        message: "No default task has been exported from ~/simplified/noDefault.mjs; please specify a task name.",
    });
});

test("main usage", async (t) => {
    t.plan(1);

    const log: [fn: "log" | "error", message: string][] = [];

    const dMock = mock<D>(t)
        .setup((d) => d.argv)
        .returns(["node", "cli.js", "--help"])
        .setup((d) => d.cwd)
        .returns(() => fixturesPath)
        .setup((d) => d.log)
        .returns((message) => log.push(["log", message.replace(/\r/g, "")]));

    await main(dMock.object());

    t.snapshot(log);
});

test("main print tasks", async (t) => {
    t.plan(2);

    const log: [fn: "log" | "error", message: string][] = [];

    const dMock = mock<D>(t)
        .setup((d) => d.argv)
        .returns(["node", "cli.js", "--tasks"])
        .setup((d) => d.cwd)
        .returns(() => fixturesPath)
        .setup((d) => d.log)
        .returns((message) => log.push(["log", message.replace(/\r/g, "")]))
        .setup((d) => d.chdir)
        .returns((directory) => t.is(directory, fixturesPath));

    await main(dMock.object());

    t.snapshot(log);
});

test("main success", async (t) => {
    t.plan(2);

    const log: [fn: "log" | "error", message: string][] = [];

    const dMock = mock<D>(t)
        .setup((d) => d.argv)
        .returns(["node", "cli.js", "--terebyfile", path.join(fixturesPath, "cliTest.mjs"), "success"])
        .setup((d) => d.cwd)
        .returns(() => fixturesPath)
        .setup((d) => d.log)
        .returns((message) => log.push(["log", message.replace(/\r/g, "")]))
        .setup((d) => d.chdir)
        .returns((directory) => t.is(directory, fixturesPath))
        .setup((d) => d.simplifyPath)
        .returns(fakeSimplifyPath)
        .setup((d) => d.prettyMilliseconds)
        .returns(() => "<pretty-ms>");

    await main(dMock.object());

    t.snapshot(log);
});

test("main failure", async (t) => {
    t.plan(4);

    const log: [fn: "log" | "error", message: string][] = [];

    const dMock = mock<D>(t)
        .setup((d) => d.argv)
        .returns(["node", "cli.js", "--terebyfile", path.join(fixturesPath, "cliTest.mjs"), "failure"])
        .setup((d) => d.cwd)
        .returns(() => fixturesPath)
        .setup((d) => d.log)
        .returns((message) => log.push(["log", message.replace(/\r/g, "")]))
        .setup((d) => d.chdir)
        .returns((directory) => t.is(directory, fixturesPath))
        .setup((d) => d.simplifyPath)
        .returns(fakeSimplifyPath)
        .setup((d) => d.prettyMilliseconds)
        .returns(() => "<pretty-ms>")
        .setup((d) => d.error)
        .returns((message) => {
            t.is(message, "Error in failure in <pretty-ms>\nError: failure!");
        })
        .setup((d) => d.setExitCode)
        .returns((code) => {
            t.is(code, 1);
        });

    await main(dMock.object());

    t.snapshot(log);
});

test("main user error", async (t) => {
    t.plan(3);

    const log: [fn: "log" | "error", message: string][] = [];

    const dMock = mock<D>(t)
        .setup((d) => d.argv)
        .returns(["node", "cli.js", "--terebyfile", path.join(fixturesPath, "cliTest.mjs"), "oops"])
        .setup((d) => d.cwd)
        .returns(() => fixturesPath)
        .setup((d) => d.log)
        .returns((message) => log.push(["log", message.replace(/\r/g, "")]))
        .setup((d) => d.chdir)
        .returns((directory) => t.is(directory, fixturesPath))
        .setup((d) => d.simplifyPath)
        .returns(fakeSimplifyPath)
        .setup((d) => d.prettyMilliseconds)
        .returns(() => "<pretty-ms>")
        .setup((d) => d.error)
        .returns((message) => log.push(["error", message.replace(/\r/g, "")]))
        .setup((d) => d.setExitCode)
        .returns((code) => {
            t.is(code, 1);
        });

    await main(dMock.object());

    t.snapshot(log);
});

test("main random throw", async (t) => {
    t.plan(4);

    const log: [fn: "log" | "error", message: string][] = [];

    const dMock = mock<D>(t)
        .setup((d) => d.argv)
        .throws(new Error("test error"))
        .setup((d) => d.error)
        .returns((message) => log.push(["error", message.replace(/\r/g, "")]))
        .setup((d) => d.setExitCode)
        .returns((code) => {
            t.is(code, 1);
        });

    await main(dMock.object());

    t.is(log[0][0], "error");
    t.true(log[0][1].includes("test error"));
    t.true(log[0][1].includes("index.test"));
});

test("main random throw no stack", async (t) => {
    t.plan(4);

    const log: [fn: "log" | "error", message: string][] = [];

    const error = new Error("test error");
    delete error.stack;

    const dMock = mock<D>(t)
        .setup((d) => d.argv)
        .throws(error)
        .setup((d) => d.error)
        .returns((message) => log.push(["error", message.replace(/\r/g, "")]))
        .setup((d) => d.setExitCode)
        .returns((code) => {
            t.is(code, 1);
        });

    await main(dMock.object());

    t.is(log[0][0], "error");
    t.true(log[0][1].includes("test error"));
    t.false(log[0][1].includes("index.test"));
});

test("main random throw primitive", async (t) => {
    t.plan(3);

    const log: [fn: "log" | "error", message: string][] = [];

    const dMock = mock<D>(t)
        .setup((d) => d.argv)
        .throws(1234)
        .setup((d) => d.error)
        .returns((message) => log.push(["error", message.replace(/\r/g, "")]))
        .setup((d) => d.setExitCode)
        .returns((code) => {
            t.is(code, 1);
        });

    await main(dMock.object());

    t.is(log[0][0], "error");
    t.true(log[0][1].includes("1234"));
});

test("main print version", async (t) => {
    t.plan(1);
    const version = "1.0.0";
    const dMock = mock<D>(t)
        .setup((d) => d.argv)
        .returns(["node", "cli.js", "--version"])
        .setup((d) => d.version)
        .returns(() => version)
        .setup((d) => d.cwd)
        .returns(() => fixturesPath)
        .setup((d) => d.log)
        .returns((message) => t.is(message, `tereby ${version}`))
        .setup((d) => d.chdir)
        .returns((directory) => t.is(directory, fixturesPath));

    await main(dMock.object());
});
