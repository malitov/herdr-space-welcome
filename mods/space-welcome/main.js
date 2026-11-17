// A space's welcome page: a tab whose only pane is this mod. Rows: a terminal, each agent (keys 1-9),
// a new space, a worktree. The guard closes it once its space has another tab.
// Two roles, by props:
// - {space}: the page.
// - {guard: true, close?}: one copy in the layout (a floating block that draws nothing). Herdr has
//   no "tab closing" event and closing a space's last tab closes the space, so the guard:
//   1. takes the close key ("space-welcome.close") and swaps a space's last tab for this page;
//   2. for closes that don't come from the key, brings the space back right after, with this page.
import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, knownAgents, run, openOverlay, props, window, keys, checking, spaces, panes, machines, exec, nextCommand } from "herdr";

// A global key bound to `name`, drawn the platform's way (⌘T on macOS, Ctrl+T elsewhere).
function shortcut(name) {
  const k = keys().find(b => b.section === "global" && b.action === name);
  if (!k?.keys.trim()) return "";
  const mac = window()?.platform === "macos";
  const names = mac ? { ctrl: "⌃", alt: "⌥", shift: "⇧", cmd: "⌘", fn: "fn" } : { ctrl: "Ctrl", alt: "Alt", shift: "Shift", cmd: "Super", fn: "Fn" };
  const alias = { secondary: mac ? "cmd" : "ctrl", super: "cmd", win: "cmd" };
  return k.keys.trim().split(/\s+/).map(stroke => {
    const parts = stroke.split("-");
    let key = parts.pop();
    if (key === "") { key = "-"; parts.pop(); }
    const held = new Set(parts.map(m => alias[m.toLowerCase()] ?? m.toLowerCase()));
    if (/^[A-Z]$/.test(key)) held.add("shift");
    const label = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1).toLowerCase();
    return [...Object.keys(names).filter(m => held.has(m)).map(m => names[m]), label].join(mac ? "" : "+");
  }).join(" ");
}

const spaceOf = () => spaces().find(s => s.id === props()?.space) ?? null;
// The installed agents (keys 1 to 9, in order), then at most two that aren't.
const choices = (agents) => [...agents.filter(a => a.installed), ...agents.filter(a => !a.installed).slice(0, 2)];

// Fallback: a space gone whose only tab wasn't Welcome lost its last tab, so it's made again.
const welcomeTabs = () => new Set(panes().filter(p => p.mod === "space-welcome").map(p => p.tab));
function snapshot() {
  const all = spaces(), welcome = welcomeTabs(), map = new Map();
  for (const s of all) {
    const machine = s.machine ?? "";
    const tabs = new Set(s.tabs.map(t => t.id));
    map.set(s.id, {
      name: s.name, named: s.named, machine, active: s.active,
      // Where it is now (its first terminal's live folder), as Herdr names and nests it.
      folder: panes().find(p => tabs.has(p.tab) && p.cwd)?.cwd || s.folder,
      // space.move counts from 1, within its machine's block.
      index: all.filter(x => (x.machine ?? "") === machine).indexOf(s) + 1,
      lone: s.tabs.length === 1 && !welcome.has(s.tabs[0].id),
      // Welcome tabs to close: the space has another tab, so the page has done its job.
      done: s.tabs.length > 1 && !busy.has(s.id) ? s.tabs.filter(t => welcome.has(t.id)).map(t => t.id) : [],
    });
  }
  return map;
}
// Spaces closeShown is working on: Welcome sits beside the last tab there for a moment, on purpose.
const busy = new Set();
function guard(prev) {
  const now = snapshot();
  for (const s of now.values()) for (const id of s.done) run("tab.close", { id });
  if (!prev) return now;
  // A machine that is loading or offline drops its spaces without anyone closing them.
  const layout = new Map(machines().map(m => [m.name ?? "", m.layout]));
  for (const [id, s] of prev) {
    if (now.has(id) || !s.lone || !s.folder || (layout.get(s.machine) ?? "ready") !== "ready") continue;
    restore(s).catch(() => {});
  }
  return now;
}
async function restore(s) {
  // herdr-app do, not run(): it answers with the new space's and its shell tab's ids. It fails when
  // the folder is gone (a removed worktree), so that space stays closed.
  // Built in the background and shown only when ready, so the shell tab is never seen.
  const r = await exec("herdr-app", ["do", "space.new", JSON.stringify({ ...(s.named ? { name: s.name } : {}), folder: s.folder, machine: s.machine, focus: false })]);
  const made = JSON.parse(r.stdout || "{}");
  if (!made.space) return;
  run("tab.new", { space: made.space, name: "Welcome", mod: "space-welcome", props: { space: made.space }, focus: false });
  run("tab.close", { id: made.tab, confirmed: true });
  run("space.move", { id: made.space, index: s.index });
  if (s.active) run("space.select", { id: made.space });
}

// Key path ("space-welcome.close"): Welcome goes behind the last tab, then the `close` prop's command.
async function closeShown(cx) {
  const close = props()?.close ?? "tab.close";
  const space = spaces().find(s => s.active), tab = space?.tabs.find(t => t.active);
  if (!tab || space.tabs.length !== 1 || welcomeTabs().has(tab.id)) return run(close);
  busy.add(space.id);
  run("tab.new", { space: space.id, name: "Welcome", mod: "space-welcome", props: { space: space.id }, focus: false });
  run(close);
  // The close was refused (pinned, a dialog): take the unused Welcome back.
  await cx.sleep(400);
  busy.delete(space.id);
  const now = spaces().find(s => s.id === space.id), welcome = welcomeTabs();
  if (now?.tabs.some(t => t.id === tab.id)) for (const t of now.tabs) if (welcome.has(t.id)) run("tab.close", { id: t.id, confirmed: true });
}

export default class Welcome extends View {
  init(_props, cx) {
    if (props()?.guard) {
      if (!checking()) cx.spawn(async (cx) => { for (;;) if (await nextCommand() === "close") await closeShown(cx); });
      return;
    }
    this.agents = [];
    this.handle = cx.focus_handle();
    this.handle.focus();
    cx.spawn(async cx => {
      try { this.agents = await knownAgents({ on: spaceOf()?.machine ?? null }); }
      catch { this.failed = true; }
      cx.notify();
    });
  }
  row(id, icon, name, action, hint = "", enabled = true) {
    const t = theme();
    return h_flex().id(id).h(32).px(10).gap(10).rounded(6).items_center().flex_none()
      .text_color(enabled ? t.foreground : t.dim).when(enabled, el => el.cursor_pointer().hover(s => s.bg(t.hover)))
      .on_click(() => { if (enabled) action(); })
      .child(div().size(16).flex_none().flex().items_center().justify_center().child(icon))
      .child(div().flex_1().min_w(0).truncate().child(name)).child(div().flex_none().text_size(12).text_color(t.dim).child(hint));
  }
  render() {
    // Renders again whenever spaces or panes change: the guard needs no timer.
    if (props()?.guard) {
      if (!checking()) this.prev = guard(this.prev);
      return div();
    }
    const t = theme();
    const space = spaceOf();
    const id = space?.id;
    const folder = space?.folder ?? null;
    const installed = this.agents.filter(a => a.installed);
    const start = (a) => run("tab.new", { name: a.name, space: id, argv: a.run });
    const label = (text) => div().h(28).flex_none().px(10).flex().items_center().text_size(12).font_medium().text_color(t.dim).child(text);
    return v_flex().id("space-welcome").track_focus(this.handle).size_full().min_h(0).bg(t.background).items_center().overflow_y_scrollbar()
      .on_key_down((e) => {
        if (e.modifiers.control || e.modifiers.platform || e.modifiers.alt) return;
        const agent = /^[1-9]$/.test(e.key) ? installed[Number(e.key) - 1] : null;
        if (agent) start(agent);
      })
      .child(v_flex().w(380).flex_none().py(48).px(16).gap(2).text_size(13)
        .child(div().px(10).text_size(18).font_semibold().text_color(t.foreground).truncate().child(space?.name ?? "This space"))
        .child(div().px(10).pb(16).text_size(12).text_color(t.dim).truncate().child(folder ? `${folder} · nothing open yet. What next?` : "Nothing open yet. What next?"))
        .child(this.row("terminal", svg("icons/shell.svg").size(14), "Terminal", () => run("tab.new", { space: id, ...(folder ? { folder } : {}) }), shortcut("tab.new")))
        .child(label("Start an agent"))
        .children(choices(this.agents).map((a, i) => this.row(a.key, a.tint ? svg(a.icon).size(14).text_color(t.foreground) : image(a.icon).size(14), a.name,
          () => start(a), a.installed ? (i < 9 ? String(i + 1) : "") : "Not installed", a.installed)))
        .when(this.agents.length === 0, el => el.child(div().px(10).py(6).text_color(t.dim).child(this.failed ? "Couldn't load agents" : "Checking installed agents…")))
        .child(div().h(1).mx(10).my(8).bg(t.border))
        .child(this.row("space", svg("mods/space-welcome/plus.svg").size(14), "New space", () => run("space.new"), shortcut("space.new")))
        .child(this.row("worktree", svg("mods/space-welcome/branch.svg").size(14), "New worktree…", () => openOverlay({ mod: "worktree", kind: "dialog", width: 460, height: 280, props: { space: id, folder, action: "new" } }), "", Boolean(space)))
        .child(this.row("worktree-open", svg("mods/space-welcome/branch.svg").size(14), "Open worktree…", () => openOverlay({ mod: "worktree", kind: "dialog", width: 560, height: 480, props: { space: id, folder, action: "open" } }), "", Boolean(space))));
  }
}
