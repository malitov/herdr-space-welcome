# Space Welcome

A welcome page for a [Herdr](https://herdr.dev) space that has no open tabs. When you close the last tab of a space, the space stays open and shows this page. The mod works alone and needs no other mod.

![Space Welcome](preview.png)

## What it does

- The page shows the name and the folder of the space.
- Click a row to open a terminal, start an installed agent, make a new space, or make a worktree.
- Press 1 to 9 to start the installed agent with that number.
- When you close the last tab of a space, the space comes back at once with only the welcome page in it.
- When the space gets another tab, the page closes.

## Install

1. Copy `mods/space-welcome/` to `~/.config/herdr-app/mods/`.
2. Add the guard to your layout (see below).
3. Run `herdr-app check ~/.config/herdr-app/mods/space-welcome`.

The guard runs two programs when it brings a space back: `test -d <folder>` (on the space's machine) and `herdr-app do space.new`. The mod does not read files and does not connect to the network.

## How the page opens

Herdr has no event for "a tab is closing", and closing the last tab of a space closes the space. So the mod brings the space back right after, with a guard: one copy of the mod in your layout that draws nothing.

- The guard remembers every space. If a space disappears and its only tab was not the welcome page, the guard makes the space again with the same name, folder, machine and place in the list, with only the welcome page in it.
- If the closed tab was the welcome page itself, the space stays closed. Close the welcome page to really close a space.
- A space closed with two or more tabs, a space whose folder is gone (a removed worktree) and spaces of a machine that went offline do not come back.
- Things to know: the space comes back as a new space (a new id) after a short flicker. A space with one tab that you close with "Close space" also comes back; close its welcome page to remove it.

Add the guard to the root node of your layout file (`~/.config/herdr-app/layouts/<name>.json`). Herdr's shipped layouts are read-only, so clone one first (`herdr-app do layout.clone '{"name":"main","as":"my-layout"}'`).

```json
"floating": [ { "id": "welcome-guard", "content": { "mod": "space-welcome", "props": { "guard": true } }, "edge": "bottom", "align": "end" } ]
```

If the root already has `floating`, add the item to that list. The mod works by itself; no other mod needs to know about it.

You can also open the page by hand:

```sh
herdr-app do tab.new '{"space":"<id>","name":"Welcome","mod":"space-welcome","props":{"space":"<id>"}}'
```

## Build it yourself

[RECIPE.md](RECIPE.md) describes the mod in full. An agent can build the mod from the recipe in an empty folder.
