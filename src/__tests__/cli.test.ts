import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import test from "ava";
import { execaNode } from "execa";
import tmp from "tmp";

const cliPath = fileURLToPath(new URL("../cli.js", import.meta.url));
const fixturesPath = fileURLToPath(new URL("cli/__fixtures__", import.meta.url));

// Coverage carries through to children; run and check that it doesn't break.

test("run cli --help", async (t) => {
    await execaNode(cliPath, ["--help"]);
    t.pass();
});

test("run cli --version", async (t) => {
    await execaNode(cliPath, ["--version"], { cwd: fixturesPath });
    t.pass();
});

test("run cli reexec", async (t) => {
    const tmpdir = tmp.dirSync({ unsafeCleanup: true });
    t.teardown(tmpdir.removeCallback);
    const dir = tmpdir.name;

    await fs.promises.writeFile(path.join(dir, "Terebyfile.mjs"), "export {};");

    const { exitCode, stderr } = await execaNode(cliPath, { cwd: dir, reject: false });
    t.is(exitCode, 1);
    t.assert(stderr.includes("Unable to find tereby; ensure tereby is installed in your package."));

    const fakeTereby = path.join(dir, "node_modules", "tereby");
    const fakeTerebyDist = path.join(fakeTereby, "dist");
    await fs.promises.mkdir(fakeTerebyDist, { recursive: true });

    await fs.promises.writeFile(
        path.join(fakeTereby, "package.json"),
        JSON.stringify({
            name: "tereby",
            type: "module",
            exports: {
                "./cli": "./dist/cli.js",
            },
        }),
    );

    await fs.promises.writeFile(path.join(fakeTerebyDist, "cli.js"), "console.log('It works!')");

    await fs.promises.writeFile(
        path.join(dir, "package.json"),
        JSON.stringify({
            name: "test",
            type: "module",
        }),
    );

    const { stdout } = await execaNode(cliPath, { cwd: dir });
    t.is(stdout, "It works!");
});

test("run cli reexec within tereby", async (t) => {
    const tmpdir = tmp.dirSync({ unsafeCleanup: true });
    t.teardown(tmpdir.removeCallback);
    const dir = tmpdir.name;

    const fakeTereby = path.join(dir, "node_modules", "tereby");
    const fakeTerebyDist = path.join(fakeTereby, "dist");
    await fs.promises.mkdir(fakeTerebyDist, { recursive: true });

    await fs.promises.writeFile(
        path.join(fakeTereby, "package.json"),
        JSON.stringify({
            name: "tereby",
            type: "module",
            exports: {
                "./cli": "./dist/cli.js",
            },
        }),
    );

    await fs.promises.writeFile(path.join(fakeTerebyDist, "cli.js"), "console.log('It works!')");

    const fakeTerebyDep = path.join(fakeTereby, "node_modules", "someDep");
    await fs.promises.mkdir(fakeTerebyDep, { recursive: true });

    await fs.promises.writeFile(
        path.join(fakeTerebyDep, "package.json"),
        JSON.stringify({
            name: "someDep",
            type: "module",
        }),
    );

    await fs.promises.writeFile(
        path.join(dir, "package.json"),
        JSON.stringify({
            name: "test",
            type: "module",
        }),
    );

    await fs.promises.writeFile(path.join(fakeTerebyDep, "Terebyfile.mjs"), "export {};");

    const { stdout } = await execaNode(cliPath, { cwd: fakeTerebyDep });
    t.is(stdout, "It works!");
});

test("exception", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "topLevelThrow.mjs");
    const { stderr, exitCode } = await execaNode(cliPath, ["--terebyfile", terebyfilePath], { reject: false });
    t.assert(stderr.includes("topLevelThrow"));
    t.snapshot(exitCode, "exitCode");
});
