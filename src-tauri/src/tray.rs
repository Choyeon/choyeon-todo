//! 系统托盘：electron/main.cjs buildTrayMenu / refreshTrayMenu 的移植。

use crate::state::{now_ms, AppState};
use serde_json::Value;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

fn today_str() -> String {
    let now = chrono_local_now();
    format!("{:04}-{:02}-{:02}", now.0, now.1, now.2)
}

/// 轻量本地日期，避免引入 chrono 依赖
fn chrono_local_now() -> (i32, u32, u32) {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    // 以本地时区偏移换算：通过 libc 不可移植，这里用 TZ 无关的 UTC+8 修正仅作托盘展示用
    // 与 renderer 的 getTodayStr 在东八区一致
    let local = secs + 8 * 3600;
    let days = local.div_euclid(86400);
    let rem = local.rem_euclid(86400);
    let (y, m, d) = civil_from_days(days);
    let _ = rem;
    (y, m, d)
}

fn civil_from_days(z: i64) -> (i32, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    ((y + if m <= 2 { 1 } else { 0 }) as i32, m as u32, d as u32)
}

#[derive(Default, Clone, Copy)]
struct Stats {
    today_count: i32,
    important_count: i32,
    overdue_count: i32,
    completed_yesterday: i32,
    reminders_pending: i32,
    focus_minutes: i32,
}

fn stats(app: &AppHandle) -> Stats {
    let state = app.state::<AppState>();
    let tasks = state.tasks.lock().unwrap();
    let today = today_str();
    let mut s = Stats::default();
    for t in tasks.tasks.iter() {
        let completed = t.get("completed").and_then(Value::as_bool).unwrap_or(false);
        let date = t.get("date").and_then(Value::as_str).unwrap_or("");
        let important = t.get("important").and_then(Value::as_bool).unwrap_or(false);
        if completed {
            let cd = t.get("completedAt").and_then(Value::as_str).unwrap_or(date);
            if cd.contains(&today) {
                s.completed_yesterday += 0;
            }
        } else {
            if date == today {
                s.today_count += 1;
                if important {
                    s.important_count += 1;
                }
            }
            if !date.is_empty() && date < today.as_str() {
                s.overdue_count += 1;
            }
            if t.get("reminder").is_some() || t.get("time").is_some() {
                s.reminders_pending += 1;
            }
        }
    }
    let pom = state.pomodoro.lock().unwrap();
    s.focus_minutes = pom.snapshot.completed_pomodoros.max(0) as i32 * 25;
    s
}

fn menu_item(app: &AppHandle, id: &str, label: &str) -> tauri::Result<MenuItem<tauri::Wry>> {
    MenuItem::with_id(app, id, label, true, None::<&str>)
}

fn check_item(
    app: &AppHandle,
    id: &str,
    label: &str,
    checked: bool,
) -> tauri::Result<MenuItem<tauri::Wry>> {
    MenuItem::with_id(app, id, label, true, None::<&str>)?;
    // Tauri 的 checkbox 用 CheckMenuItem；这里用普通项 + 前缀勾选符号保持视觉一致
    let prefix = if checked { "✓ " } else { "   " };
    MenuItem::with_id(app, id, format!("{}{}", prefix, label), true, None::<&str>)
}

pub fn build(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let state = app.state::<AppState>();
    let s = stats(app);
    let (dnd, auto_launch, close_to_quit) = {
        let cfg = state.settings.lock().unwrap();
        (cfg.do_not_disturb, cfg.auto_start, cfg.close_to_quit)
    };
    let running = state.pomodoro.lock().unwrap().snapshot.is_running;

    let main_label = "Choyeon To Do";
    let open = menu_item(app, "tray:toggle", main_label)?;
    let quick_add = menu_item(app, "tray:quickAddNew", "快速添加任务")?;
    let new_task = menu_item(app, "tray:taskNew", "新建任务")?;
    let search = menu_item(app, "tray:focusSearch", "搜索任务")?;
    let sep1 = PredefinedMenuItem::separator(app)?;

    let stat_completed = menu_item(
        app,
        "tray:statCompleted",
        &format!("  已完成：{} 项", s.focus_minutes / 25),
    )?;
    let stat_focus = menu_item(
        app,
        "tray:statFocus",
        &format!(
            "  专注分：{}（{} 分钟）",
            s.focus_minutes.min(100),
            s.focus_minutes
        ),
    )?;
    let stat_reminders = menu_item(
        app,
        "tray:statReminders",
        &format!("  待提醒：{} 项", s.reminders_pending),
    )?;
    let stat_today = menu_item(
        app,
        "tray:statToday",
        &format!(
            "  今日待办：{} · 重要：{} · 逾期：{}",
            s.today_count, s.important_count, s.overdue_count
        ),
    )?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let pom_start = menu_item(app, "tray:pomStart", "开始番茄工作 25 分钟")?;
    let pom_pause = menu_item(app, "tray:pomPause", "暂停")?;
    let pom_skip = menu_item(app, "tray:pomSkip", "跳过当前段")?;
    let pom_ai = menu_item(app, "tray:pomAi", "AI 模式（智能切换）")?;
    let pomodoro = Submenu::with_items(
        app,
        "番茄钟",
        true,
        &[
            &pom_start,
            &pom_pause,
            &pom_skip,
            &PredefinedMenuItem::separator(app)?,
            &pom_ai,
        ],
    )?;

    let snaps: Vec<MenuItem<tauri::Wry>> = vec![
        menu_item(app, "snap:left-half", "左半屏")?,
        menu_item(app, "snap:right-half", "右半屏")?,
        menu_item(app, "snap:top-half", "上半屏")?,
        menu_item(app, "snap:bottom-half", "下半屏")?,
        menu_item(app, "snap:top-left", "左上象限")?,
        menu_item(app, "snap:top-right", "右上象限")?,
        menu_item(app, "snap:bottom-left", "左下象限")?,
        menu_item(app, "snap:bottom-right", "右下象限")?,
    ];
    let snap_items: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = snaps
        .iter()
        .map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>)
        .collect();
    let layouts = Submenu::with_items(app, "窗口布局", true, &snap_items)?;

    let dnd_item = check_item(app, "tray:dnd", "免打扰模式", dnd)?;
    let auto_item = check_item(app, "tray:autoLaunch", "开机自启", auto_launch)?;
    let update = menu_item(app, "tray:checkUpdate", "检查更新")?;
    let settings = menu_item(app, "tray:settings", "设置")?;
    let quit = MenuItem::with_id(app, "tray:quit", "退出", true, None::<&str>)?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let sep4 = PredefinedMenuItem::separator(app)?;

    let _ = running;
    let _ = close_to_quit;
    let _ = open;

    Menu::with_items(
        app,
        &[
            &open,
            &quick_add,
            &new_task,
            &search,
            &sep1,
            &stat_completed,
            &stat_focus,
            &stat_reminders,
            &stat_today,
            &sep2,
            &pomodoro,
            &layouts,
            &dnd_item,
            &auto_item,
            &sep3,
            &update,
            &settings,
            &sep4,
            &quit,
        ],
    )
}

pub fn refresh(app: &AppHandle) {
    let menu = build(app).ok();
    let state = app.state::<AppState>();
    let guard = state.tray.lock().unwrap();
    if let Some(tray) = guard.as_ref() {
        if let Some(menu) = menu {
            let _ = tray.set_menu(Some(menu));
        }
        let _ = tray.set_tooltip(Some("Choyeon To Do"));
    }
}

pub fn setup(app: &AppHandle) {
    let icon =
        tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png")).expect("tray icon");
    let menu = match build(app) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("[Tray] build menu failed: {e}");
            return;
        }
    };
    let tray = match TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .tooltip("Choyeon To Do")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                let w = app.get_webview_window("main");
                if let Some(w) = w {
                    if w.is_visible().unwrap_or(false) {
                        let _ = w.hide();
                    } else {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
            }
        })
        .build(app)
    {
        Ok(t) => t,
        Err(e) => {
            eprintln!("[Tray] build tray failed: {e}");
            return;
        }
    };
    let state = app.state::<AppState>();
    *state.tray.lock().unwrap() = Some(tray);
}

pub fn handle_menu_event(app: &AppHandle, id: &str) {
    let state = app.state::<AppState>();
    match id {
        "tray:toggle" => {
            if let Some(w) = app.get_webview_window("main") {
                if w.is_visible().unwrap_or(false) {
                    let _ = w.hide();
                } else {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        }
        "tray:taskNew" => {
            show_main(app);
            let _ = app.emit("task:new", ());
        }
        "tray:focusSearch" => {
            show_main(app);
            let _ = app.emit("shortcut:focusSearch", ());
        }
        "tray:settings" => {
            show_main(app);
            let _ = app.emit("navigate:settings", ());
        }
        "tray:quickAddNew" => {
            show_main(app);
            let _ = app.emit("app:handleProtocolUrl", "choyeon-todo://quickadd");
        }
        "tray:dnd" => {
            let enabled = {
                let mut cfg = state.settings.lock().unwrap();
                cfg.do_not_disturb = !cfg.do_not_disturb;
                cfg.do_not_disturb
            };
            crate::commands::persist_settings(app);
            let _ = app.emit("settings:doNotDisturbChanged", enabled);
            refresh(app);
        }
        "tray:autoLaunch" => {
            let enabled = {
                let mut cfg = state.settings.lock().unwrap();
                cfg.auto_start = !cfg.auto_start;
                cfg.auto_start
            };
            crate::commands::apply_autostart(app, enabled);
            crate::commands::persist_settings(app);
            refresh(app);
        }
        "tray:checkUpdate" => {
            crate::commands::check_updates(app.clone());
        }
        "tray:quit" => {
            *state.is_quitting.lock().unwrap() = true;
            app.exit(0);
        }
        "tray:pomStart" => {
            crate::pomodoro::switch_mode(app, "work");
            crate::pomodoro::start(app);
        }
        "tray:pomPause" => crate::pomodoro::pause(app),
        "tray:pomSkip" => crate::pomodoro::skip(app),
        "tray:pomAi" => {
            show_main(app);
            let _ = app.emit("pomodoro:aiMode", ());
        }
        id if id.starts_with("snap:") => {
            let position = id.trim_start_matches("snap:");
            crate::commands::snap_window(app, position);
        }
        _ => {}
    }
    let _ = now_ms();
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}
