mod commands;
mod pomodoro;
mod shortcuts;
mod state;
mod tray;

use state::AppState;
use tauri::menu::{Menu, MenuItem};
use tauri::{Emitter, Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // single-instance 必须第一个注册
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
                let _ = w.unminimize();
            }
            // 协议 URL 由 deep-link 插件负责，这里仅兜底 argv
            for arg in args {
                if arg.starts_with("choyeon-todo://") {
                    let app = app.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(80));
                        let _ = app.emit("app:handleProtocolUrl", arg);
                    });
                    break;
                }
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--hidden"])
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            commands::load_settings(&handle);
            commands::apply_autostart(&handle, handle.state::<AppState>().settings.lock().unwrap().auto_start);

            // 配置文件菜单（macOS 需要）与托盘
            let hide = MenuItem::with_id(app, "hide", "隐藏主界面", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&hide, &quit])?;
            app.set_menu(menu)?;
            tray::setup(&handle);

            // 监听托盘菜单事件（Tauri v2 菜单事件在 app 层统一分发）
            let event_handle = handle.clone();
            app.on_menu_event(move |_app, event| {
                let id = event.id().as_ref();
                if id.starts_with("tray:") || id.starts_with("snap:") {
                    tray::handle_menu_event(&event_handle, id);
                } else if id == "hide" {
                    if let Some(w) = event_handle.get_webview_window("main") {
                        let _ = w.hide();
                    }
                } else if id == "quit" {
                    *event_handle.state::<AppState>().is_quitting.lock().unwrap() = true;
                    event_handle.exit(0);
                }
            });

            // 主窗口事件：焦点广播 + 关闭到托盘
            if let Some(main) = app.get_webview_window("main") {
                let w = main.clone();
                let focus_app = handle.clone();
                main.on_window_event(move |event| match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        let quit = focus_app.state::<AppState>().settings.lock().unwrap().close_to_quit;
                        if quit || *focus_app.state::<AppState>().is_quitting.lock().unwrap() {
                            return;
                        }
                        api.prevent_close();
                        let _ = w.hide();
                        let _ = focus_app.emit("app:window-hidden", serde_json::json!({"reason": "close"}));
                    }
                    WindowEvent::Focused(focused) => {
                        let ev = if *focused { "app:focus-gained" } else { "app:focus-lost" };
                        let _ = focus_app.emit(ev, serde_json::json!({"reason": "window-focus"}));
                    }
                    WindowEvent::Destroyed => {
                        // 保存窗口状态已由各平台原生恢复机制处理
                    }
                    _ => {}
                });
            }

            // 最大化状态变化广播
            if let Some(main) = app.get_webview_window("main") {
                let change_app = handle.clone();
                main.on_window_event(move |event| {
                    if let WindowEvent::Resized(_) = event {
                        if let Some(w) = change_app.get_webview_window("main") {
                            let _ = change_app.emit("window:maximizeChanged", w.is_maximized().unwrap_or(false));
                        }
                    }
                });
            }

            // 文件拖入：Tauri 原生 file-drop 事件 -> Electron 兼容事件
            if let Some(main) = app.get_webview_window("main") {
                let drop_app = handle.clone();
                main.on_window_event(move |event| {
                    if let WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) = event {
                        let files: Vec<serde_json::Value> = paths
                            .iter()
                            .map(|p| {
                                serde_json::json!({
                                    "path": p.to_string_lossy().to_string(),
                                    "name": p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "file".into())
                                })
                            })
                            .collect();
                        let _ = drop_app.emit("app:filesDropped", files);
                    }
                });
            }

            // 协议 URL：冷启动 + 运行中
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let link_app = handle.clone();
                if let Ok(Some(urls)) = handle.deep_link().get_current() {
                    for url in urls {
                        let _ = link_app.emit("app:handleProtocolUrl", url.to_string());
                    }
                }
                #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
                {
                    let _ = handle.deep_link().register_all();
                }
                let on_url_app = handle.clone();
                handle.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        let _ = on_url_app.emit("app:handleProtocolUrl", url.to_string());
                    }
                });
            }

            shortcuts::apply_default(&handle);
            pomodoro::spawn_timer(handle.clone());

            // --hidden 静默启动
            if std::env::args().any(|a| a == "--hidden") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
                let _ = handle.emit("app:window-hidden", serde_json::json!({"reason": "hidden-launch"}));
            }

            // 启动 20 秒后首次更新检查
            let update_app = handle.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(20));
                if !*update_app.state::<AppState>().is_quitting.lock().unwrap() {
                    tauri::async_runtime::spawn(async move {
                        let _ = commands::updater_check_for_updates(update_app).await;
                    });
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // 子窗口关闭时通知主窗口（对应 pomodoro:fullscreenClosed）
            if let WindowEvent::Destroyed = event {
                if window.label() == "pomodoro-fullscreen" {
                    let _ = window.app_handle().emit("pomodoro:fullscreenClosed", ());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_get_version,
            commands::app_get_app_version,
            commands::window_minimize,
            commands::window_toggle_maximize,
            commands::window_close,
            commands::window_is_maximized,
            commands::window_is_visible,
            commands::window_show,
            commands::window_hide,
            commands::window_snap_layout,
            commands::open_dev_tools,
            commands::notification_send,
            commands::notification_show,
            commands::tasks_sync,
            commands::settings_set_auto_start,
            commands::settings_get_auto_start,
            commands::settings_set_close_to_quit,
            commands::settings_get_close_to_quit,
            commands::settings_set_do_not_disturb,
            commands::settings_get_do_not_disturb,
            commands::settings_set_global_shortcut_enabled,
            commands::settings_get_global_shortcut_enabled,
            commands::app_set_auto_launch,
            commands::app_get_auto_launch,
            commands::pomodoro_open_fullscreen,
            commands::pomodoro_close_fullscreen,
            commands::pomodoro_open_fab,
            commands::pomodoro_close_fab,
            commands::pomodoro_toggle_fab,
            commands::pomodoro_state_sync,
            commands::pomodoro_ready,
            commands::pomodoro_get_state,
            commands::pomodoro_action,
            commands::pomodoro_set_duration,
            commands::mini_open,
            commands::mini_close,
            commands::mini_toggle,
            commands::mini_show_main,
            commands::mini_toggle_always_on_top,
            commands::quick_add_close,
            commands::hotkey_register,
            commands::hotkey_unregister_all,
            commands::task_start_drag,
            commands::dialog_save_json,
            commands::updater_check_for_updates,
            commands::updater_download_update,
            commands::updater_quit_and_install,
        ])
        .run(tauri::generate_context!())
        .expect("error while running choyeon-todo");
}
