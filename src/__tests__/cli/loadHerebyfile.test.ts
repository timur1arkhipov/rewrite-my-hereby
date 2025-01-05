import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import test from "ava";
import tmp from "tmp";

import { findTerebyfile, loadTerebyfile } from "../../cli/loadTerebyfile.js";
import { UserError } from "../../cli/utils.js";

const fixturesPath = fileURLToPath(new URL("__fixtures__", import.meta.url));

test("normal file", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "Terebyfile.mjs");

    const terebyfile = await loadTerebyfile(terebyfilePath);
    t.snapshot(terebyfile);
});

test("duplicate export", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "duplicate.mjs");

    await t.throwsAsync(
        async () => {
            await loadTerebyfile(terebyfilePath);
        },
        { instanceOf: UserError, message: 'Task "a" has been exported twice.' },
    );
});

test("duplicate name", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "duplicateNames.mjs");

    await t.throwsAsync(
        async () => {
            await loadTerebyfile(terebyfilePath);
        },
        { instanceOf: UserError, message: 'Task "a" was declared twice.' },
    );
});

test("no exports", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "noExports.mjs");

    await t.throwsAsync(
        async () => {
            await loadTerebyfile(terebyfilePath);
        },
        { instanceOf: UserError, message: "No tasks found. Did you forget to export your tasks?" },
    );
});

test("no tasks", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "notTask.mjs");

    await t.throwsAsync(
        async () => {
            await loadTerebyfile(terebyfilePath);
        },
        { instanceOf: UserError, message: "No tasks found. Did you forget to export your tasks?" },
    );
});

test("findTerebyfile", async (t) => {
    const tmpdir = tmp.dirSync({ unsafeCleanup: true });
    t.teardown(tmpdir.removeCallback);
    const dir = tmpdir.name;
    const deepest = path.join(dir, "source", "package", "src", "cli");
    const src = path.join(dir, "source", "package", "src");
    const packageRoot = path.join(dir, "source", "package");
    const expectedTerebyFile = path.join(src, "Terebyfile.mjs");
    const unexpectedTerebyFile = path.join(src, "Terebyfile.js");

    await fs.promises.mkdir(deepest, { recursive: true });
    await fs.promises.writeFile(path.join(packageRoot, "package.json"), "{}");
    await fs.promises.writeFile(expectedTerebyFile, "export {}");

    t.throws(() => findTerebyfile(dir), {
        instanceOf: UserError,
        message: "Unable to find Terebyfile.",
    });

    t.throws(() => findTerebyfile(path.join(dir, "source")), {
        instanceOf: UserError,
        message: "Unable to find Terebyfile.",
    });

    t.throws(() => findTerebyfile(packageRoot), {
        instanceOf: UserError,
        message: "Unable to find Terebyfile.",
    });

    t.is(findTerebyfile(deepest), expectedTerebyFile);
    t.is(findTerebyfile(src), expectedTerebyFile);

    await fs.promises.mkdir(path.join(deepest, "Terebyfile.js"));

    t.throws(() => findTerebyfile(deepest), {
        instanceOf: UserError,
        message: "Terebyfile.js is not a file.",
    });

    await fs.promises.writeFile(unexpectedTerebyFile, "export {}");

    t.throws(() => findTerebyfile(src), {
        instanceOf: UserError,
        message: "Found more than one Terebyfile: Terebyfile.js, Terebyfile.mjs",
    });
});

test("cycle", async (t) => {
    const terebyfilePath = path.join(fixturesPath, "cycle.mjs");

    await t.throwsAsync(
        async () => {
            await loadTerebyfile(terebyfilePath);
        },
        { instanceOf: UserError, message: 'Task "a" references itself.' },
    );
});
