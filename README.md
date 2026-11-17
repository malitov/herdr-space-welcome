# Space Welcome

A welcome page for a [Herdr](https://herdr.dev) space that has no open tabs. When you close the last tab of a space, the space stays open and shows this page.

![Space Welcome](preview.png)

## What it does

- The page shows the name and the folder of the space.
- Click a row to open a terminal, start an installed agent, make a new space, or make a worktree.
- Press 1 to 9 to start the installed agent with that number.
- When the space gets another tab, the page closes.

## Install

1. Copy `mods/space-welcome/` to `~/.config/herdr-app/mods/`.
2. Run `herdr-app check ~/.config/herdr-app/mods/space-welcome`.

The mod does not run programs, does not read files, and does not connect to the network.

## How the page opens

Herdr does not open the page by itself. A mod or a key must open it with this command:

```
tab.new {space, name: "Welcome", mod: "space-welcome", props: {space}}
```

The [tab-pin](https://github.com/malitov/herdr-tab-pin) mod sends this command when you close the last tab of a space. You can also open the page from a terminal:

```sh
herdr-app do tab.new '{"space":"<id>","name":"Welcome","mod":"space-welcome","props":{"space":"<id>"}}'
```

## Build it yourself

[RECIPE.md](RECIPE.md) describes the mod in full. An agent can build the mod from the recipe in an empty folder.
