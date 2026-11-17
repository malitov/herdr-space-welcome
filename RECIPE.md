# Space Welcome

A welcome page for a space with nothing open. Instead of closing the space with its last tab, you get a
calm page in a tab named "Welcome": the space's name, its folder and "nothing open yet. What next?",
then one-click rows to open a terminal, start any installed agent (keys 1–9), make a new space or a
worktree. As soon as the space has another tab, the page closes itself.

![Space Welcome](preview.png)

## What you see

The whole pane, `background` color, content centered horizontally in a 380px column, 48px from the
top, scrolling if short of room. Text 13px.

- **Title**: the space's name, 18px semibold, `foreground`, truncated.
- **Subtitle**: `<folder> · nothing open yet. What next?` (or just the sentence without a folder),
  12px `dim`, 16px below.
- **Rows**, each 32px tall, radius 6, padding 0 10px, gap 10px: a 16px icon cell, the label, and a
  12px `dim` hint on the right. Hover `hover`; disabled rows `dim` and not clickable.
  1. **Terminal** (`icons/shell.svg`), hint: the global `tab.new` key (`⌘T` on macOS, `Ctrl+T` elsewhere).
  2. Label **Start an agent** (28px, 12px medium `dim`).
  3. One row per installed agent, with its icon and name, hint `1`…`9`; then up to two agents that
     aren't installed, disabled, hint "Not installed". While loading: "Checking installed agents…";
     on failure: "Couldn't load agents".
  4. A 1px `border` line.
  5. **New space** (plus icon), hint: the `space.new` key. **New worktree…** and **Open worktree…**
     (branch icon).

## How it behaves

- Clicking Terminal: `tab.new {space, folder}` in the space's folder. An agent row or its number key
  (no modifiers): `tab.new {name, space, argv: agent.run}`. New space: `space.new`. Worktree rows open
  Herdr's shipped `worktree` mod as a dialog (460×280 with `action: "new"`, 560×480 with
  `action: "open"`, props `{space, folder}`).
- The page takes the keyboard when it opens (`focusable`).
- Every second it checks its space: once the space has more than one tab, it closes its own tab
  (`tab.close`). It never closes itself while it's the last tab (that would close the space). Closing
  it by hand then is Herdr's own close, which asks before the space goes.
- Agent statuses aren't shown here; the page only starts things.

## Built from

- One mod, `mods/space-welcome/`: `main.js`, `mod.json`
  `{ "place": "none", "title": "Welcome", "focusable": true }`, and `plus.svg`, `branch.svg` (lucide).
- Opened as a tab whose only pane is the mod:
  `tab.new {space, name: "Welcome", mod: "space-welcome", props: {space: <space id>}}`. The
  [tab-pin](https://github.com/malitov/herdr-tab-pin) mod does this when you close a space's last tab;
  any mod, key or `herdr-app do tab.new` can do it too.
- `herdr` used: `theme`, `knownAgents({on: space.machine})`, `run`, `openOverlay`, `props`, `window`,
  `keys`, `checking`, `spaces`, `panes`. Commands: `tab.new`, `tab.close`, `space.new`.
- Shipped things it uses: `icons/shell.svg`, the `worktree` mod.
- Nothing reaches the network, runs programs or reads files.

## Watch out

- Nothing in Herdr opens the page by itself: something must run the `tab.new` above, before closing
  the last tab with `tab.close {id, confirmed: true}`. Open the welcome tab first, then close the old one.
- `props.space` is required; without it the page shows "This space" and its worktree rows are disabled.
- The self-close loop finds its own tab through `panes()` (`p.mod === "space-welcome"`), so a renamed
  copy of the mod must change that name too.
- Skip the loop and other side effects under `checking()`.
- Agent keys are 1–9 only, counted over installed agents.

## Done when

- `herdr-app check ~/.config/herdr-app/mods/space-welcome` passes.
- `herdr-app do tab.new '{"space":"<id>","name":"Welcome","mod":"space-welcome","props":{"space":"<id>"}}'`
  shows the page with the space's name, folder and installed agents numbered from 1.
- Pressing `1` starts the first agent in a new tab, and within about a second the Welcome tab is gone.
- With it as the space's only tab, it stays open.
