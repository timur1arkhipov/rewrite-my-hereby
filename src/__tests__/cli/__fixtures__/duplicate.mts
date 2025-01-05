import { task } from "tereby";

export const a = task({
    name: "a",
    run: async () => {},
});

export const b = a;
