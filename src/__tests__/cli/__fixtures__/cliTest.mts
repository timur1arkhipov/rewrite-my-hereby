import { task } from "tereby";

export const success = task({
    name: "success",
    run: () => {},
});

export const failure = task({
    name: "failure",
    run: () => {
        throw new Error("failure!");
    },
});
