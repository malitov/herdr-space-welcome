// A space's welcome page: a tab whose only pane is this mod, so closing a space's last real tab
// doesn't close the space. Rows: a terminal, each agent (keys 1-9), a new space, a worktree.
// Two roles, by props:
// - {space}: the page.
// - {guard: true}: one copy in the layout (a floating block that draws nothing). Herdr has no
//   "tab closing" event, so the guard acts ahead: a space left with one real tab gets a Welcome tab
//   beside it (not shown), and a Welcome tab goes once its space has two real tabs again.
import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, knownAgents, run, openOverlay, props, window, keys, checking, spaces, panes } from "herdr";

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

// The guard's pass over every space. `asked` maps a space or tab id to when it was acted on, so
// repeated passes before Herdr's data catches up don't act twice; after RETRY ms it may try again
// (a tab.new right after space.new can be lost).
const RETRY = 3000;
function guard(asked) {
  const now = Date.now();
  const once = (id, act) => { if (now - (asked.get(id) ?? 0) < RETRY) return; asked.set(id, now); act(); };
  const welcomeTabs = new Set(panes().filter(p => p.mod === "space-welcome").map(p => p.tab));
  for (const s of spaces()) {
    const mine = s.tabs.filter(t => welcomeTabs.has(t.id));
    const real = s.tabs.length - mine.length;
    if (real === 1 && mine.length === 0) {
      once(s.id, () => run("tab.new", { space: s.id, name: "Welcome", mod: "space-welcome", props: { space: s.id }, focus: false }));
      continue;
    }
    // Two real tabs: no Welcome needed. Otherwise keep one (the first) and close extras.
    for (const t of real >= 2 ? mine : mine.slice(1)) once(t.id, () => run("tab.close", { id: t.id, confirmed: true }));
  }
  for (const [id, at] of asked) if (now - at > RETRY * 10) asked.delete(id);
}

export default class Welcome extends View {
  init(_props, cx) {
    if (props()?.guard) {
      this.asked = new Map();
      // ponytail: 1s poll as backup to render; a lost tab.new gets no new render to retry from.
      if (!checking()) cx.timer.every(1000, () => guard(this.asked));
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
      if (!checking()) guard(this.asked);
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
