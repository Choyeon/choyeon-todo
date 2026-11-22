use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;

/// 与 electron/main.cjs 中 appSettings 一一对应
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub close_to_quit: bool,
    pub auto_start: bool,
    pub do_not_disturb: bool,
    pub global_shortcut_enabled: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            close_to_quit: true,
            auto_start: false,
            do_not_disturb: false,
            global_shortcut_enabled: true,
        }
    }
}

/// 与 electron/main.cjs 中 pomodoroState 的广播字段一一对应（camelCase）
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroSnapshot {
    pub current_mode: String,
    pub time_left: i64,
    pub total_time: i64,
    pub is_running: bool,
    pub has_started: bool,
    pub completed_pomodoros: i64,
    pub current_mode_label: String,
    pub current_color: String,
    pub formatted_time: String,
    pub sync_timestamp: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct PomodoroRuntime {
    pub snapshot: PomodoroSnapshot,
    /// 运行结束的绝对时间（毫秒）；None 表示暂停/停止
    pub end_time: Option<i64>,
    /// 暂停时剩余秒数
    pub pause_left: i64,
    /// 各模式时长覆盖（秒）
    pub durations: HashMap<String, i64>,
}

impl Default for PomodoroRuntime {
    fn default() -> Self {
        Self {
            snapshot: PomodoroSnapshot {
                current_mode: "work".into(),
                time_left: 25 * 60,
                total_time: 25 * 60,
                is_running: false,
                has_started: false,
                completed_pomodoros: 0,
                current_mode_label: "专注".into(),
                current_color: "#EF4444".into(),
                formatted_time: "25:00".into(),
                sync_timestamp: None,
            },
            end_time: None,
            pause_left: 25 * 60,
            durations: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct TaskCache {
    pub tasks: Vec<serde_json::Value>,
    pub categories: Vec<serde_json::Value>,
}

pub struct AppState {
    pub settings: Mutex<AppSettings>,
    pub pomodoro: Mutex<PomodoroRuntime>,
    pub tasks: Mutex<TaskCache>,
    pub registered_hotkeys: Mutex<Vec<String>>,
    /// isQuitting：区分“用户主动退出”与“关闭窗口隐藏到托盘”
    pub is_quitting: Mutex<bool>,
    pub update_downloaded: Mutex<bool>,
    /// 托盘图标句柄（Tauri v2 TrayIcon 在 build 后需保活）
    pub tray: Mutex<Option<tauri::tray::TrayIcon>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            settings: Mutex::new(AppSettings::default()),
            pomodoro: Mutex::new(PomodoroRuntime::default()),
            tasks: Mutex::new(TaskCache::default()),
            registered_hotkeys: Mutex::new(Vec::new()),
            is_quitting: Mutex::new(false),
            update_downloaded: Mutex::new(false),
            tray: Mutex::new(None),
        }
    }
}

pub fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn format_time(seconds: i64) -> String {
    let s = seconds.max(0);
    format!("{:02}:{:02}", s / 60, s % 60)
}

pub fn mode_info(mode: &str) -> (&'static str, &'static str) {
    match mode {
        "shortBreak" => ("短休息", "#22C55E"),
        "longBreak" => ("长休息", "#06B6D4"),
        _ => ("专注", "#EF4444"),
    }
}
