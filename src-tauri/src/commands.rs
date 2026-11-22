//! Tauri commands：electron/main.cjs 中所有 ipcMain.on/handle 的移植。
//! 命令名与 preload.cjs 的 channel 字符串完全一致，兼容桥直接映射。

use crate::state::{now_ms, AppState};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn settings_path(app: &AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("app-settings.json")
}

pub fn load_settings(app: &AppHandle) {
    let path = settings_path(app);
    let Ok(text) = std::fs::read_to_string(path) else {
        return;
    };
    let Ok(data) = serde_json::from_str::<Value>(&text) else {
        return;
    };
    let state = app.state::<AppState>();
    let mut cfg = state.settings.lock().unwrap();
    if let Some(v) = data.get("closeToQuit").and_then(Value::as_bool) {
        cfg.close_to_quit = v;
    }
    if let Some(v) = data.get("autoStart").and_then(Value::as_bool) {
        cfg.auto_start = v;
    }
    if let Some(v) = data.get("doNotDisturb").and_then(Value::as_bool) {
        cfg.do_not_disturb = v;
    }
    if let Some(v) = data.get("globalShortcutEnabled").and_then(Value::as_bool) {
        cfg.global_shortcut_enabled = v;
    }
}

pub fn persist_settings(app: &AppHandle) {
    let state = app.state::<AppState>();
    let cfg = state.settings.lock().unwrap();
    let value = serde_json::to_vec(&*cfg).unwrap_or_default();
    let path = settings_path(app);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(path, value);
}

pub fn apply_autostart(app: &AppHandle, enabled: bool) {
    // v2.7 中 trait 名为 ManagerExt，方法名 autolaunch()
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    let result = if enabled {
        manager.enable()
    } else {
        manager.disable()
    };
    if let Err(e) = result {
        eprintln!("[Autostart] failed: {e}");
    }
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
        let _ = w.unminimize();
    }
}

fn child_window(app: &AppHandle, label: &str, route: &str, title: &str, w: f64, h: f64) {
    if let Some(existing) = app.get_webview_window(label) {
        let _ = existing.show();
        let _ = existing.set_focus();
        return;
    }
    let url = format!("index.html#/{}?slave=1", route);
    let result = WebviewWindowBuilder::new(app, label, WebviewUrl::App(url.into()))
        .title(title)
        .inner_size(w, h)
        .resizable(false)
        .skip_taskbar(true)
        .build();
    if let Err(e) = result {
        eprintln!("[Window] create {label} failed: {e}");
    }
}

pub fn snap_window(app: &AppHandle, position: &str) {
    let Some(w) = app.get_webview_window("main") else {
        return;
    };
    let Some(monitor) = w.current_monitor().ok().flatten() else {
        return;
    };
    let area = monitor.work_area();
    let (x, y, width, height) = (
        area.position.x,
        area.position.y,
        area.size.width,
        area.size.height,
    );
    let half_w = width / 2;
    let half_h = height / 2;
    let (nx, ny, nw, nh) = match position {
        "left-half" => (x, y, half_w, height),
        "right-half" => (x + half_w as i32, y, half_w, height),
        "top-half" => (x, y, width, half_h),
        "bottom-half" => (x, y + half_h as i32, width, half_h),
        "top-left" => (x, y, half_w, half_h),
        "top-right" => (x + half_w as i32, y, half_w, half_h),
        "bottom-left" => (x, y + half_h as i32, half_w, half_h),
        "bottom-right" => (x + half_w as i32, y + half_h as i32, half_w, half_h),
        _ => return,
    };
    let _ = w.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: nx,
        y: ny,
    }));
    let _ = w.set_size(tauri::Size::Physical(tauri::PhysicalSize {
        width: nw,
        height: nh,
    }));
}

// ============ 窗口控制 ============

#[tauri::command]
pub fn window_minimize(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.minimize();
        let _ = app.emit("app:window-hidden", json!({"reason": "minimize"}));
    }
}

#[tauri::command]
pub fn window_toggle_maximize(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let maximized = w.is_maximized().unwrap_or(false);
        let _ = if maximized {
            w.unmaximize()
        } else {
            w.maximize()
        };
        let _ = app.emit("window:maximizeChanged", !maximized);
    }
}

#[tauri::command]
pub fn window_close(app: AppHandle) {
    let close_to_quit = app
        .state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .close_to_quit;
    if let Some(w) = app.get_webview_window("main") {
        if close_to_quit {
            *app.state::<AppState>().is_quitting.lock().unwrap() = true;
            app.exit(0);
        } else {
            let _ = w.hide();
            let _ = app.emit("app:window-hidden", json!({"reason": "close"}));
        }
    }
}

#[tauri::command]
pub fn window_is_maximized(app: AppHandle) -> bool {
    app.get_webview_window("main")
        .and_then(|w| w.is_maximized().ok())
        .unwrap_or(false)
}

#[tauri::command]
pub fn window_is_visible(app: AppHandle) -> bool {
    app.get_webview_window("main")
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false)
}

#[tauri::command]
pub fn window_show(app: AppHandle) {
    show_main(&app);
}

#[tauri::command]
pub fn window_hide(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
        let _ = app.emit("app:window-hidden", json!({"reason": "api"}));
    }
}

#[tauri::command]
pub fn window_snap_layout(app: AppHandle, position: String) {
    snap_window(&app, &position);
}

#[tauri::command]
pub fn open_dev_tools(app: AppHandle) {
    #[cfg(debug_assertions)]
    if let Some(w) = app.get_webview_window("main") {
        w.open_devtools();
    }
    let _ = app;
}

// ============ 设置 ============

#[tauri::command]
pub fn settings_set_auto_start(app: AppHandle, enabled: bool) -> bool {
    apply_autostart(&app, enabled);
    app.state::<AppState>().settings.lock().unwrap().auto_start = enabled;
    persist_settings(&app);
    true
}

#[tauri::command]
pub fn settings_get_auto_start(app: AppHandle) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .is_enabled()
        .unwrap_or_else(|_| app.state::<AppState>().settings.lock().unwrap().auto_start)
}

#[tauri::command]
pub fn settings_set_close_to_quit(app: AppHandle, enabled: bool) -> bool {
    app.state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .close_to_quit = enabled;
    persist_settings(&app);
    true
}

#[tauri::command]
pub fn settings_get_close_to_quit(app: AppHandle) -> bool {
    app.state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .close_to_quit
}

#[tauri::command]
pub fn settings_set_do_not_disturb(app: AppHandle, enabled: bool) -> bool {
    app.state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .do_not_disturb = enabled;
    persist_settings(&app);
    crate::tray::refresh(&app);
    true
}

#[tauri::command]
pub fn settings_get_do_not_disturb(app: AppHandle) -> bool {
    app.state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .do_not_disturb
}

#[tauri::command]
pub fn settings_set_global_shortcut_enabled(app: AppHandle, enabled: bool) -> bool {
    app.state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .global_shortcut_enabled = enabled;
    persist_settings(&app);
    crate::shortcuts::apply_default(&app);
    true
}

#[tauri::command]
pub fn settings_get_global_shortcut_enabled(app: AppHandle) -> bool {
    app.state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .global_shortcut_enabled
}

// ============ 自启动（新 API） ============

#[tauri::command]
pub fn app_set_auto_launch(app: AppHandle, enabled: bool) -> Value {
    apply_autostart(&app, enabled);
    app.state::<AppState>().settings.lock().unwrap().auto_start = enabled;
    persist_settings(&app);
    json!({"ok": true, "openAtLogin": enabled, "openAsHidden": true})
}

#[tauri::command]
pub fn app_get_auto_launch(app: AppHandle) -> Value {
    use tauri_plugin_autostart::ManagerExt;
    let enabled = app.autolaunch().is_enabled().unwrap_or(false);
    json!({
        "ok": true,
        "openAtLogin": enabled,
        "openAsHidden": true,
        "wasOpenedAtLogin": std::env::args().any(|a| a == "--hidden"),
        "willLaunchAtLogin": enabled,
        "args": if enabled { vec!["--hidden"] } else { vec![] }
    })
}

// ============ 应用信息 / 任务同步 ============

#[tauri::command]
pub fn app_get_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub fn app_get_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub fn tasks_sync(app: AppHandle, tasks: Option<Vec<Value>>, categories: Option<Vec<Value>>) {
    let state = app.state::<AppState>();
    {
        let mut cache = state.tasks.lock().unwrap();
        if let Some(t) = tasks {
            cache.tasks = t;
        }
        if let Some(c) = categories {
            cache.categories = c;
        }
    }
    crate::tray::refresh(&app);
}

// ============ 通知 ============

#[tauri::command]
pub fn notification_send(
    app: AppHandle,
    title: Option<String>,
    body: Option<String>,
    task_id: Option<String>,
) {
    let dnd = app
        .state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .do_not_disturb;
    if dnd {
        return;
    }
    let title = title.unwrap_or_else(|| "Choyeon To Do".into());
    let body = body.unwrap_or_default();
    send_native_notification(&app, &title, &body);
    let _ = app.emit(
        "notification:response",
        json!({"action": "clicked", "taskId": task_id}),
    );
}

#[tauri::command]
pub fn notification_show(app: AppHandle, payload: Option<Value>) -> Value {
    let Some(p) = payload else {
        return json!({"success": false, "error": "invalid_payload"});
    };
    let title = p
        .get("title")
        .and_then(Value::as_str)
        .unwrap_or("Choyeon To Do")
        .to_string();
    let body = p
        .get("body")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let task_id = p.get("taskId").and_then(Value::as_str).map(str::to_string);
    let dnd = app
        .state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .do_not_disturb;
    if dnd {
        return json!({"success": true, "suppressed": true});
    }
    send_native_notification(&app, &title, &body);
    let _ = app.emit(
        "notification:response",
        json!({"action": "clicked", "taskId": task_id}),
    );
    json!({"success": true})
}

fn send_native_notification(app: &AppHandle, title: &str, body: &str) {
    use tauri_plugin_notification::NotificationExt;
    let result = app.notification().builder().title(title).body(body).show();
    if let Err(e) = result {
        eprintln!("[Notification] failed: {e}");
    }
}

// ============ Bing 壁纸 ============

#[tauri::command]
pub async fn bing_get_wallpaper() -> Option<Value> {
    let endpoints = [
        "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN",
        "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US",
    ];
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .ok()?;
    for endpoint in endpoints {
        let Ok(res) = client
            .get(endpoint)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
            .send()
            .await
        else { continue };
        let Ok(json) = res.json::<Value>().await else {
            continue;
        };
        let Some(images) = json.get("images").and_then(Value::as_array) else {
            continue;
        };
        let Some(img) = images.first() else { continue };
        let mut url = img
            .get("url")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        if url.starts_with('/') {
            url = format!("https://cn.bing.com{}", url);
        }
        if url.contains("UHD") && !url.contains("_1920x1080") {
            url = url.replace("UHD", "1920x1080");
        }
        if url.is_empty() {
            continue;
        }
        return Some(json!({
            "url": url,
            "copyright": img.get("copyright").and_then(Value::as_str).unwrap_or(""),
            "title": img.get("title").and_then(Value::as_str).unwrap_or("")
        }));
    }
    None
}

// ============ 番茄钟 ============

#[tauri::command]
pub fn pomodoro_open_fullscreen(app: AppHandle) {
    let (w, h) = primary_size(&app);
    child_window(
        &app,
        "pomodoro-fullscreen",
        "pomodoro-fullscreen",
        "Choyeon To Do - 专注模式",
        w,
        h,
    );
}

#[tauri::command]
pub fn pomodoro_close_fullscreen(app: AppHandle) {
    if let Some(w) = app.get_webview_window("pomodoro-fullscreen") {
        let _ = w.close();
    }
}

#[tauri::command]
pub fn pomodoro_open_fab(app: AppHandle) {
    child_window(
        &app,
        "pomodoro-fab",
        "pomodoro-fab",
        "番茄钟悬浮球",
        160.0,
        160.0,
    );
}

#[tauri::command]
pub fn pomodoro_close_fab(app: AppHandle) {
    if let Some(w) = app.get_webview_window("pomodoro-fab") {
        let _ = w.close();
    }
}

#[tauri::command]
pub fn pomodoro_toggle_fab(app: AppHandle) {
    if let Some(w) = app.get_webview_window("pomodoro-fab") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
        }
    } else {
        pomodoro_open_fab(app);
    }
}

#[tauri::command]
pub fn pomodoro_state_sync(app: AppHandle, state: Option<Value>) {
    if let Some(s) = state {
        if let Some(count) = s.get("completedPomodoros").and_then(Value::as_i64) {
            app.state::<AppState>()
                .pomodoro
                .lock()
                .unwrap()
                .snapshot
                .completed_pomodoros = count;
        }
    }
    crate::pomodoro::broadcast(&app);
}

#[tauri::command]
pub fn pomodoro_ready(app: AppHandle) {
    let snapshot = crate::pomodoro::snapshot_of(&app);
    let _ = app.emit("pomodoro:stateUpdated", snapshot);
}

#[tauri::command]
pub fn pomodoro_get_state(app: AppHandle) -> Value {
    serde_json::to_value(crate::pomodoro::snapshot_of(&app)).unwrap_or(json!({}))
}

#[tauri::command]
pub fn pomodoro_action(app: AppHandle, action: String) {
    crate::pomodoro::action(&app, &action);
}

#[tauri::command]
pub fn pomodoro_set_duration(app: AppHandle, mode: String, minutes: i64) {
    crate::pomodoro::set_duration(&app, &mode, minutes);
}

fn primary_size(app: &AppHandle) -> (f64, f64) {
    app.primary_monitor()
        .ok()
        .flatten()
        .map(|m| (m.size().width as f64, m.size().height as f64))
        .unwrap_or((1920.0, 1080.0))
}

// ============ 迷你窗口 / 快速添加 ============

#[tauri::command]
pub fn mini_open(app: AppHandle) {
    child_window(&app, "mini-window", "mini-window", "迷你窗口", 280.0, 400.0);
}

#[tauri::command]
pub fn mini_close(app: AppHandle) {
    if let Some(w) = app.get_webview_window("mini-window") {
        let _ = w.close();
    }
}

#[tauri::command]
pub fn mini_toggle(app: AppHandle) {
    if let Some(w) = app.get_webview_window("mini-window") {
        if w.is_visible().unwrap_or(false) {
            let _ = w.hide();
        } else {
            let _ = w.show();
        }
    } else {
        mini_open(app);
    }
}

#[tauri::command]
pub fn mini_show_main(app: AppHandle) {
    show_main(&app);
}

#[tauri::command]
pub fn mini_toggle_always_on_top(app: AppHandle) -> bool {
    if let Some(w) = app.get_webview_window("mini-window") {
        let current = w.is_always_on_top().unwrap_or(true);
        let next = !current;
        let _ = w.set_always_on_top(next);
        return next;
    }
    false
}

#[tauri::command]
pub fn quick_add_close(app: AppHandle) {
    if let Some(w) = app.get_webview_window("quick-add") {
        let _ = w.close();
    }
}

// ============ 全局快捷键 ============

#[tauri::command]
pub fn hotkey_register(app: AppHandle, binds: Option<Vec<Value>>) -> Value {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let binds = binds.unwrap_or_default();
    let mut results = Vec::new();
    let state = app.state::<AppState>();
    let mut registered = state.registered_hotkeys.lock().unwrap();
    for bind in binds {
        let key = bind
            .get("key")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        let accelerator = bind
            .get("accelerator")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        if key.is_empty() || accelerator.is_empty() {
            results.push(
                json!({"key": key, "accelerator": accelerator, "ok": false, "err": "invalid_bind"}),
            );
            continue;
        }
        let tauri_accel = crate::shortcuts::normalize(&accelerator);
        {
            let all = app.global_shortcut();
            if all.is_registered(tauri_accel.as_str()) {
                let _ = all.unregister(tauri_accel.as_str());
            }
        }
        let key_for_event = key.clone();
        let accel_for_event = accelerator.clone();
        let cb_app = app.clone();
        match app.global_shortcut().on_shortcut(
            tauri_accel.as_str(),
            move |_app, _shortcut, event| {
                use tauri_plugin_global_shortcut::ShortcutState;
                if event.state == ShortcutState::Pressed {
                    let _ = cb_app.emit(
                        "hotkey:pressed",
                        json!({
                            "key": key_for_event,
                            "accelerator": accel_for_event
                        }),
                    );
                }
            },
        ) {
            Ok(_) => {
                registered.push(tauri_accel);
                results.push(json!({"key": key, "accelerator": accelerator, "ok": true}));
            }
            Err(e) => results.push(
                json!({"key": key, "accelerator": accelerator, "ok": false, "err": e.to_string()}),
            ),
        }
    }
    json!({"ok": true, "results": results})
}

#[tauri::command]
pub fn hotkey_unregister_all(app: AppHandle) -> Value {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let state = app.state::<AppState>();
    let mut registered = state.registered_hotkeys.lock().unwrap();
    for acc in registered.iter() {
        let _ = app.global_shortcut().unregister(acc.as_str());
    }
    registered.clear();
    json!({"ok": true})
}

// ============ 拖拽导出 ============

#[tauri::command]
pub fn task_start_drag(app: AppHandle, payload: Option<Value>) -> Value {
    let Some(p) = payload else {
        return json!({"ok": false, "err": "invalid_payload"});
    };
    let task_id = p
        .get("taskId")
        .and_then(Value::as_str)
        .map(str::to_string)
        .unwrap_or_else(|| format!("task_{}", now_ms()));
    let title = p
        .get("title")
        .and_then(Value::as_str)
        .unwrap_or(&task_id)
        .to_string();
    let html = p
        .get("html")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let plain = p
        .get("plainText")
        .and_then(Value::as_str)
        .unwrap_or(&title)
        .to_string();

    // 生成临时 HTML 文件，供外部文件夹接收（对应 Electron 的 exportAsFile）
    if p.get("exportAsFile")
        .and_then(Value::as_bool)
        .unwrap_or(true)
    {
        if let Ok(dir) = app.path().temp_dir() {
            let safe: String = title
                .chars()
                .map(|c| {
                    if "\\/:*?\"<>|\r\n\t".contains(c) {
                        '_'
                    } else {
                        c
                    }
                })
                .take(60)
                .collect();
            let file = dir.join(format!(
                "{}_{}.html",
                safe,
                &task_id[..task_id.len().min(8)]
            ));
            let content = if html.is_empty() {
                format!("<!doctype html><meta charset=\"utf-8\"><title>{}</title><body><h1>{}</h1><pre>{}</pre></body>", title, title, plain)
            } else {
                html
            };
            let _ = std::fs::write(&file, content);
        }
    }
    json!({"ok": true, "taskId": task_id, "webFallback": true})
}

// ============ 保存 JSON ============

#[tauri::command]
pub fn dialog_save_json(payload: Option<Value>) -> Value {
    let Some(p) = payload else {
        return json!({"success": false, "error": "invalid_payload"});
    };
    let default_path = p
        .get("defaultPath")
        .and_then(Value::as_str)
        .unwrap_or("data.json");
    let content = p.get("content").and_then(Value::as_str).unwrap_or("");
    let dialog = rfd::FileDialog::new()
        .set_file_name(default_path)
        .add_filter("JSON", &["json"]);
    if let Some(path) = dialog.save_file() {
        if std::fs::write(&path, content).is_ok() {
            return json!({"success": true, "path": path.to_string_lossy().to_string()});
        }
    }
    json!({"success": false, "error": "cancelled"})
}

// ============ 更新器 ============

/// 供托盘菜单同步调用：在后台线程触发一次更新检查
pub fn check_updates(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let _ = updater_check_for_updates(app).await;
    });
}

#[tauri::command]
pub async fn updater_check_for_updates(app: AppHandle) -> Value {
    use tauri_plugin_updater::UpdaterExt;
    let _ = app.emit("updater:checking", ());
    let version = app.package_info().version.to_string();
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            let _ = app.emit("updater:error", json!({"message": e.to_string()}));
            return json!({"success": false, "error": e.to_string()});
        }
    };
    match updater.check().await {
        Ok(Some(update)) => {
            let _ = app.emit(
                "updater:update-available",
                json!({
                    "version": update.version,
                    "releaseNotes": update.body.unwrap_or_default(),
                    "releaseDate": update.date.map(|d| d.to_string())
                }),
            );
            json!({"success": true, "version": version})
        }
        Ok(None) => {
            let _ = app.emit("updater:update-not-available", json!({"version": version}));
            json!({"success": true, "version": version})
        }
        Err(e) => {
            let _ = app.emit("updater:error", json!({"message": e.to_string()}));
            json!({"success": false, "error": e.to_string()})
        }
    }
}

#[tauri::command]
pub async fn updater_download_update(app: AppHandle) -> Value {
    if *app.state::<AppState>().update_downloaded.lock().unwrap() {
        return json!({"success": true, "alreadyDownloaded": true});
    }
    use tauri_plugin_updater::UpdaterExt;
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => return json!({"success": false, "error": e.to_string()}),
    };
    let update = match updater.check().await {
        Ok(Some(u)) => u,
        Ok(None) => return json!({"success": false, "error": "no_update"}),
        Err(e) => return json!({"success": false, "error": e.to_string()}),
    };
    let app_handle = app.clone();
    let result = update
        .download_and_install(
            |chunk, length| {
                let total = length.unwrap_or(0);
                let percent = if total > 0 {
                    (chunk as f64 / total as f64) * 100.0
                } else {
                    0.0
                };
                let _ = app_handle.emit(
                    "updater:download-progress",
                    json!({
                        "percent": percent,
                        "transferred": chunk,
                        "total": total
                    }),
                );
            },
            || {},
        )
        .await;
    match result {
        Ok(_) => {
            *app.state::<AppState>().update_downloaded.lock().unwrap() = true;
            let _ = app.emit("updater:update-downloaded", ());
            json!({"success": true})
        }
        Err(e) => {
            let _ = app.emit("updater:error", json!({"message": e.to_string()}));
            json!({"success": false, "error": e.to_string()})
        }
    }
}

#[tauri::command]
pub fn updater_quit_and_install(app: AppHandle) -> bool {
    let downloaded = *app.state::<AppState>().update_downloaded.lock().unwrap();
    if downloaded {
        *app.state::<AppState>().is_quitting.lock().unwrap() = true;
        app.restart();
    }
    downloaded
}
