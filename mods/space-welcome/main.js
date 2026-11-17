// A space's welcome page: a tab whose only pane is this mod, shown in place of a space's last tab so
// closing that tab doesn't close the space (the tab-pin mod opens it; anything can, with
// tab.new {space, mod: "space-welcome", props: {space}}). Rows: a terminal, each agent (keys 1-9),
// a new space, a worktree. It closes itself once its space has another tab.
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

export default class Welcome extends View {
  init(_props, cx) {
    this.agents = [];
    this.handle = cx.focus_handle();
    this.handle.focus();
    cx.spawn(async cx => {
      try { this.agents = await knownAgents({ on: spaceOf()?.machine ?? null }); }
      catch { this.failed = true; }
      cx.notify();
    });
    if (checking()) return;
    // Once the space has another tab (a row here, + or a key), this page has done its job: it goes.
    // Never while it's the last tab: that would close the space. A loop, not render: a hidden tab
    // (the new one is shown) doesn't render.
    cx.spawn(async cx => {
      for (;;) {
        await cx.sleep(1000);
        const space = spaceOf();
        if (!space) return;
        const mine = new Set(space.tabs.map(t => t.id));
        const me = panes().find(p => p.mod === "space-welcome" && mine.has(p.tab));
        if (me && space.tabs.length > 1) { run("tab.close", { id: me.tab }); return; }
      }
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
