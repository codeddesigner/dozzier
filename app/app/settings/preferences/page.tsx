"use client";
import { Toggle } from "@/components/ui";
import { Card, Row, Select, SettingsHead, SaveButton, useSetting } from "@/components/settings/kit";
import { applyTheme, type Theme } from "@/components/Theme";

type Prefs = { theme: Theme; language: string; timezone: string; date_format: string; week_start: string; landing: string; compact: boolean; shortcuts: boolean };
const DEFAULT: Prefs = { theme: "light", language: "English (United Kingdom)", timezone: "(GMT+00:00) London", date_format: "13 Nov 2026", week_start: "Monday", landing: "Dashboard", compact: false, shortcuts: true };
const TZS = ["(GMT-08:00) Los Angeles", "(GMT-05:00) New York", "(GMT+00:00) London", "(GMT+01:00) Lagos", "(GMT+01:00) Paris", "(GMT+03:00) Nairobi", "(GMT+04:00) Dubai", "(GMT+05:30) Mumbai", "(GMT+08:00) Singapore", "(GMT+09:00) Tokyo"];

export default function Preferences() {
  const s = useSetting<Prefs>("prefs", DEFAULT);
  const v = { ...DEFAULT, ...s.value };
  const set = <K extends keyof Prefs>(k: K, x: Prefs[K]) => s.update({ ...v, [k]: x });
  return (
    <>
      <SettingsHead title="Preferences" sub="Personalise how Dozzier looks and behaves for you." action={<SaveButton onClick={() => s.save()} saving={s.saving} />} />
      <Card title="Appearance" sub="Choose a theme. System follows your OS.">
        <div className="theme-pick">
          {(["light", "dark", "system"] as Theme[]).map((t) => (
            <label key={t} className={`theme-opt ${v.theme === t ? "on" : ""}`}>
              <span className={`theme-swatch ${t}`}><span /><span /><span /></span>
              <span className="row gap-8"><input type="radio" name="theme" checked={v.theme === t} onChange={() => { set("theme", t); applyTheme(t); }} />{t[0].toUpperCase() + t.slice(1)}</span>
            </label>
          ))}
        </div>
      </Card>
      <Card title="Language & region">
        <div className="set-grid">
          <label className="field"><span className="label">Language</span><select className="input" value={v.language} onChange={(e) => set("language", e.target.value)}><option>English (United Kingdom)</option><option>English (United States)</option></select></label>
          <label className="field"><span className="label">Time zone</span><select className="input" value={v.timezone} onChange={(e) => set("timezone", e.target.value)}>{TZS.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="field"><span className="label">Date format</span><select className="input" value={v.date_format} onChange={(e) => set("date_format", e.target.value)}><option>13 Nov 2026</option><option>Nov 13, 2026</option><option>2026-11-13</option></select></label>
          <label className="field"><span className="label">Week starts on</span><select className="input" value={v.week_start} onChange={(e) => set("week_start", e.target.value)}><option>Monday</option><option>Sunday</option></select></label>
        </div>
      </Card>
      <Card title="Behaviour">
        <Row title="Default landing page" sub="Open this page when I sign in"><Select value={v.landing} onChange={(x) => set("landing", x)} options={["Dashboard", "Content", "Spaces", "Contacts"]} /></Row>
        <Row title="Compact tables" sub="Show more rows with tighter spacing"><Toggle on={v.compact} onChange={(x) => { set("compact", x); document.documentElement.classList.toggle("compact", x); }} /></Row>
        <Row title="Keyboard shortcuts" sub="⌘K search, ⌘L create link, ⌘\ sidebar"><Toggle on={v.shortcuts} onChange={(x) => set("shortcuts", x)} /></Row>
      </Card>
    </>
  );
}
