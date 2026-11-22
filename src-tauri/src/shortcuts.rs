//! 全局快捷键：electron/main.cjs registerGlobalShortcuts + Task 6B 动态注册。

use crate::state::AppState;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

/// Electron accelerator -> Tauri shortcut 字符串
pub fn normalize(acc: &str) -> String {
    acc.split('+')
        .map(|part| match part.trim() {
            "CommandOrControl" | "CmdOrCtrl" | "Cmd" | "Super" => if cfg!(target_os = "macos") {
                "Meta"
            } else {
                "Control"
            }
            .to_string(),
            "Command" => "Meta".to_string(),
            "Control" | "Ctrl" => "Control".to_string(),
            "Alt" | "Option" => "Alt".to_string(),
            "Shift" => "Shift".to_string(),
            other => other.to_string(),
        })
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("+")
}

/// Electron 的 4 个默认全局快捷键
pub fn apply_default(app: &AppHandle) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let enabled = app
        .state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .global_shortcut_enabled;
    if !enabled {
        return;
    }

    let bindings = [
        ("CommandOrControl+Shift+N", "toggleWindow"),
        ("CommandOrControl+Shift+K", "focusSearch"),
        ("CommandOrControl+Alt+M", "doNotDisturb"),
        ("CommandOrControl+Shift+P", "togglePomodoro"),
    ];

    // 先注销旧的默认键，避免重复注册
    for (acc, _) in bindings.iter() {
        let normalized = normalize(acc);
        let _ = app.global_shortcut().unregister(normalized.as_str());
    }

    for (acc, key) in bindings.iter() {
        let normalized = normalize(acc);
        let app_for_cb = app.clone();
        let key = key.to_string();
        if let Err(e) =
            app.global_shortcut()
                .on_shortcut(normalized.as_str(), move |_app, _shortcut, event| {
                    use tauri_plugin_global_shortcut::ShortcutState;
                    if event.state == ShortcutState::Pressed {
                        handle(&app_for_cb, &key);
                    }
                })
        {
            eprintln!("[Shortcut] register {} failed: {e}", normalized);
        }
    }
}

fn handle(app: &AppHandle, key: &str) {
    match key {
        "toggleWindow" => {
            if let Some(w) = app.get_webview_window("main") {
                if w.is_visible().unwrap_or(false) {
                    let _ = w.hide();
                } else {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        }
        "focusSearch" => {
            show_main(app);
            let _ = app.emit("shortcut:focusSearch", ());
        }
        "doNotDisturb" => {
            let enabled = {
                let state = app.state::<AppState>();
                let mut cfg = state.settings.lock().unwrap();
                cfg.do_not_disturb = !cfg.do_not_disturb;
                cfg.do_not_disturb
            };
            crate::commands::persist_settings(app);
            let _ = app.emit("settings:doNotDisturbChanged", enabled);
            crate::tray::refresh(app);
        }
        "togglePomodoro" => {
            show_main(app);
            let _ = app.emit("shortcut:togglePomodoro", ());
        }
        _ => {
            let _ = app.emit("hotkey:pressed", json!({ "key": key, "accelerator": key }));
        }
    }
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
        let _ = w.unminimize();
    }
}
