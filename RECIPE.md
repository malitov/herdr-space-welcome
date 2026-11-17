# Space Welcome

A welcome page for a space with nothing open. Instead of closing the space with its last tab, you get a
calm page in a tab named "Welcome": the space's name, its folder and "nothing open yet. What next?",
then one-click rows to open a terminal, start any installed agent (keys 1–9), make a new space or a
worktree. As soon as the space has another tab, the page closes itself. A guard copy of the mod in the
layout takes the close key and swaps a space's last tab for this page; for other closes it brings the
space back, with only this page, right after.

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
- **Guard** (`props.guard: true`, one copy as a floating block in the layout, draws an empty `div()`).
- Guard, key path (`nextCommand()` gives `"close"`; key `space-welcome.close`): `close` = the guard's
  `close` prop, default `tab.close`. If the shown space's shown tab is its only tab and not Welcome:
  `tab.new {space, name: "Welcome", mod: "space-welcome", props: {space}, focus: false}`, then
  `run(close)`; 400ms later, if that tab is still there (the close was refused: a pinned tab, a
  dialog), close the Welcome tabs of that space again. Otherwise just `run(close)`. The space never
  closes and Herdr doesn't ask.
- Guard, self-close: on every render, in a space with more than one tab, each Welcome tab is closed
  (`tab.close {id}`), even in a space that isn't shown. Skipped for a space the key path is working on
  (a `busy` set), where Welcome sits beside the last tab for a moment on purpose.
- Guard, fallback: on every render it snapshots each space: name, `named`, machine, active, folder (the first terminal
  pane's live `cwd` from `panes()`, else `space.folder`), its 1-based index within its machine's
  block, and `lone` (exactly one tab, and that tab has no `space-welcome` pane). A space in the last
  snapshot but not this one, that was `lone`, whose machine is `ready` in `machines()`, and whose
  folder is set is restored, in the background:
  1. `exec("herdr-app", ["do", "space.new", JSON.stringify({name (only if named), folder, machine, focus: false})])`
     → `{space, tab}`; it fails when the folder is gone, and then nothing is restored;
  2. `tab.new {space, name: "Welcome", mod: "space-welcome", props: {space}, focus: false}`;
  3. `tab.close {id: <the shell tab>, confirmed: true}`;
  4. `space.move {id: space, index}`;
  5. `space.select {id: space}` if the lost space was the shown one.
- A space whose only tab was Welcome, or that had two or more tabs, stays closed.
- Agent statuses aren't shown here; the page only starts things.

## Built from

- One mod, `mods/space-welcome/`: `main.js`, `mod.json`
  `{ "place": "none", "title": "Welcome", "focusable": true }`, and `plus.svg`, `branch.svg` (lucide).
- Two roles by `props`: the page (`{space}`), a tab whose only pane is the mod; and the guard
  (`{guard: true}`), in the layout root's `floating`:
  `{ "id": "welcome-guard", "content": { "mod": "space-welcome", "props": { "guard": true } }, "edge": "bottom", "align": "end" }`.
  Without the guard, nothing opens the page; `herdr-app do tab.new` with the page props still works.
- `herdr` used: `theme`, `knownAgents({on: space.machine})`, `run`, `openOverlay`, `props`, `window`,
  `keys`, `checking`, `spaces`, `panes`, `machines`, `exec`, `nextCommand`. Commands: `tab.new`,
  `tab.close`, `space.new`, `space.move`, `space.select`, and the `close` prop's command.
- `keys.json`: `"cmd-w": "space-welcome.close"` in `global` (and in a `layout:<name>` section that binds cmd-w).
- Shipped things it uses: `icons/shell.svg`, the `worktree` mod.
- Program, only when restoring: `herdr-app do space.new`. No network, no file reads.

## Watch out

- Herdr has no "tab closing" event and closing a space's last tab closes the space. Only the key
  path can act before the close. The fallback can only bring the space back after: a new space id,
  and another space shows for a moment.
- Key path: don't close the last tab yourself; put Welcome behind it (`focus: false`) and send the
  `close` command, so another tab bar's rules (a pinned tab) still hold. Then take Welcome back if
  the tab is still there.
- Fallback: build the space with `focus: false` and select it last, or the shell tab flashes.
- `space.close` on a one-tab space looks the same as closing its last tab, so it comes back too;
  closing its Welcome tab removes it for good.
- A deliberate close stays closed: when shared `space.closing` is `{id, at}` for the vanished space and
  `at` is under 2 minutes old, the guard skips the restore and clears the key. A space menu sets it
  just before `space.close` (one line: `setShared("space.closing", { id, at: Date.now() })`).
- `run()` returns nothing: use `herdr-app do space.new` through `exec` to learn the new ids.
- Open the Welcome tab before closing the shell tab, or the space closes again.
- Skip spaces of machines that aren't `ready` (they vanish when a machine goes offline). A space
  whose folder is gone (a removed worktree) isn't restored because `space.new` fails there.
- The first snapshot after a (re)load restores nothing.
- The page must not take focus in the guard role (`init` returns early).
- The page doesn't close itself: the guard does it. A page opened by hand in a layout without the
  guard stays until closed.
- The key path must mark its space `busy`, or the self-close removes the Welcome tab it just put
  behind the last tab, and the space closes.
- `props.space` is required; without it the page shows "This space" and its worktree rows are disabled.
- The guard finds Welcome tabs through `panes()` (`p.mod === "space-welcome"`), so a renamed copy of
  the mod must change that name too.
- Skip the guard under `checking()`.
- Agent keys are 1–9 only, counted over installed agents.

## Done when

- `herdr-app check ~/.config/herdr-app/mods/space-welcome` passes.
- `herdr-app do tab.new '{"space":"<id>","name":"Welcome","mod":"space-welcome","props":{"space":"<id>"}}'`
  shows the page with the space's name, folder and installed agents numbered from 1.
- `herdr-app do space-welcome.close` on a shown space with one tab → same space id, only Welcome, no
  dialog. With two tabs → the shown tab closes. On Welcome as the only tab → Herdr asks.
- With `"close": "tab-pin.close"` and the only tab pinned → the pinned toast, the tab stays, no
  Welcome tab left behind.
- `tab.close {id, confirmed: true}` on the only tab of a background space → within a second the space
  is back in the same place with only Welcome.
- Close that Welcome tab → the space goes for good.
- A space with two tabs closed with `space.close`, or one whose folder was deleted → stays closed.
- Pressing `1` on the page starts the first agent in a new tab, and within about a second Welcome is gone.
