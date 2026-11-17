# Space Welcome

A welcome page for a [Herdr](https://herdr.dev) space that has no open tabs. When you close the last tab of a space, the space stays open and shows this page. The mod works alone and needs no other mod.

![Space Welcome](preview.png)

## What it does

- The page shows the name and the folder of the space.
- Click a row to open a terminal, start an installed agent, make a new space, or make a worktree.
- Press 1 to 9 to start the installed agent with that number.
- When you close the last tab of a space with cmd-w, the space stays and shows the welcome page.
- When the space gets another tab, the page closes.

## Install

1. Copy `mods/space-welcome/` to `~/.config/herdr-app/mods/`.
2. Add the guard to your layout (see below).
3. Merge `keys.json` into `~/.config/herdr-app/keys.json`. If your layout has a `layout:<name>` section that binds cmd-w, change that key too. The layout section wins over `global`.
4. Run `herdr-app check ~/.config/herdr-app/mods/space-welcome`.

When the guard brings a space back, it runs one program: `herdr-app do space.new`. The mod does not read files and does not connect to the network.

## How the page opens

Herdr has no event for "a tab is closing", and closing the last tab of a space closes the space. So the mod uses a guard: one copy of the mod in your layout that draws nothing. The guard works in two ways.

**1. The close key (no flicker).** cmd-w goes to the guard (`space-welcome.close`).

- On the last tab of a space, the guard puts the welcome page behind the tab and then closes the tab. The space never closes, and Herdr does not ask "Close space?".
- On any other tab, the key closes the tab as usual.
- On the welcome page itself, Herdr asks and then closes the space.

**2. Other closes (fallback).** The × on a tab, a menu, or a shell that exits close the space before the mod can act. The guard then makes the space again with the same name, folder, machine and place in the list, with only the welcome page in it.

- The space comes back as a new space (a new id). Another space shows for a moment first.
- A space with one tab that you close with "Close space" also comes back. Close its welcome page to remove it.
- A space closed with two or more tabs, a space whose folder is gone (a removed worktree) and spaces of a machine that went offline do not come back.

Add the guard to the root node of your layout file (`~/.config/herdr-app/layouts/<name>.json`). Herdr's shipped layouts are read-only, so clone one first (`herdr-app do layout.clone '{"name":"main","as":"my-layout"}'`).

```json
"floating": [ { "id": "welcome-guard", "content": { "mod": "space-welcome", "props": { "guard": true } }, "edge": "bottom", "align": "end" } ]
```

If the root already has `floating`, add the item to that list.

### With another tab bar

The guard closes tabs with `tab.close`. If your tab bar has its own close command with its own rules, name it in the guard's `close` prop. The guard then sends every close to that command. For example, with [tab-pin](https://github.com/malitov/herdr-tab-pin), pinned tabs stay protected:

```json
"props": { "guard": true, "close": "tab-pin.close" }
```

The mod works without this prop; no other mod needs to know about it.

You can also open the page by hand:

```sh
herdr-app do tab.new '{"space":"<id>","name":"Welcome","mod":"space-welcome","props":{"space":"<id>"}}'
```

## Build it yourself

[RECIPE.md](RECIPE.md) describes the mod in full. An agent can build the mod from the recipe in an empty folder.
