//! 番茄钟引擎：electron/main.cjs 第 305-524 行的忠实移植。
//! 主进程持有唯一真值，每秒广播给主窗口/全屏/悬浮球/迷你窗口。

use crate::state::{format_time, mode_info, now_ms, PomodoroRuntime, PomodoroSnapshot};
use tauri::{Emitter, Manager};

fn default_duration(mode: &str) -> i64 {
    match mode {
        "shortBreak" => 5 * 60,
        "longBreak" => 15 * 60,
        _ => 25 * 60,
    }
}

pub fn get_total(rt: &PomodoroRuntime, mode: &str) -> i64 {
    rt.durations
        .get(mode)
        .copied()
        .filter(|v| *v > 0)
        .unwrap_or_else(|| default_duration(mode))
}

fn calculate_left(rt: &PomodoroRuntime) -> i64 {
    if !rt.snapshot.is_running {
        return rt.pause_left;
    }
    match rt.end_time {
        Some(end) => (end - now_ms()).max(0) / 1000 + ((end - now_ms()).max(0) % 1000 != 0) as i64,
        None => rt.pause_left,
    }
}

fn refresh(rt: &mut PomodoroRuntime) {
    let left = calculate_left(rt);
    let (label, color) = mode_info(&rt.snapshot.current_mode);
    rt.snapshot.time_left = left;
    rt.snapshot.total_time = get_total(rt, &rt.snapshot.current_mode);
    rt.snapshot.current_mode_label = label.into();
    rt.snapshot.current_color = color.into();
    rt.snapshot.formatted_time = format_time(left);
    rt.snapshot.sync_timestamp = Some(now_ms());
}

/// 向所有窗口广播番茄钟状态 Tauri 事件（对应 Electron 的 win.webContents.send）
pub fn broadcast(app: &tauri::AppHandle) {
    let state = app.state::<crate::state::AppState>();
    let snapshot = {
        let mut guard = state.pomodoro.lock().unwrap();
        refresh(&mut guard);
        guard.snapshot.clone()
    };
    let _ = app.emit("pomodoro:stateUpdated", snapshot);
}

pub fn tick(app: &tauri::AppHandle) {
    let state = app.state::<crate::state::AppState>();
    let should_complete = {
        let guard = state.pomodoro.lock().unwrap();
        guard.snapshot.is_running && calculate_left(&guard) <= 0
    };
    if should_complete {
        complete(app);
    } else {
        broadcast(app);
    }
}

pub fn start(app: &tauri::AppHandle) {
    let state = app.state::<crate::state::AppState>();
    {
        let mut rt = state.pomodoro.lock().unwrap();
        if rt.snapshot.is_running {
            return;
        }
        if rt.pause_left <= 0 {
            rt.pause_left = get_total(&rt, &rt.snapshot.current_mode.clone());
        }
        if rt.pause_left <= 0 {
            return;
        }
        rt.snapshot.is_running = true;
        rt.snapshot.has_started = true;
        rt.end_time = Some(now_ms() + rt.pause_left * 1000);
    }
    broadcast(app);
    crate::tray::refresh(app);
}

pub fn pause(app: &tauri::AppHandle) {
    let state = app.state::<crate::state::AppState>();
    {
        let mut rt = state.pomodoro.lock().unwrap();
        rt.pause_left = calculate_left(&rt);
        rt.snapshot.is_running = false;
        rt.end_time = None;
    }
    broadcast(app);
    crate::tray::refresh(app);
}

pub fn reset(app: &tauri::AppHandle) {
    let state = app.state::<crate::state::AppState>();
    {
        let mut rt = state.pomodoro.lock().unwrap();
        let total = get_total(&rt, &rt.snapshot.current_mode.clone());
        rt.pause_left = total;
        rt.snapshot.is_running = false;
        rt.snapshot.has_started = false;
        rt.end_time = None;
    }
    broadcast(app);
    crate::tray::refresh(app);
}

pub fn switch_mode(app: &tauri::AppHandle, mode: &str) {
    if !matches!(mode, "work" | "shortBreak" | "longBreak") {
        return;
    }
    let state = app.state::<crate::state::AppState>();
    {
        let mut rt = state.pomodoro.lock().unwrap();
        if rt.snapshot.current_mode == mode {
            return;
        }
        let total = get_total(&rt, mode);
        rt.snapshot.current_mode = mode.into();
        rt.pause_left = total;
        rt.snapshot.is_running = false;
        rt.snapshot.has_started = false;
        rt.end_time = None;
    }
    broadcast(app);
    crate::tray::refresh(app);
}

pub fn skip(app: &tauri::AppHandle) {
    let state = app.state::<crate::state::AppState>();
    let has_started = state.pomodoro.lock().unwrap().snapshot.has_started;
    if !has_started {
        return;
    }
    {
        let mut rt = state.pomodoro.lock().unwrap();
        let mode = rt.snapshot.current_mode.clone();
        rt.pause_left = get_total(&rt, &mode);
        rt.snapshot.is_running = false;
        rt.snapshot.has_started = false;
        rt.end_time = None;
    }
    broadcast(app);
    crate::tray::refresh(app);
}

fn complete(app: &tauri::AppHandle) {
    let state = app.state::<crate::state::AppState>();
    let payload = {
        let mut rt = state.pomodoro.lock().unwrap();
        let ended_mode = rt.snapshot.current_mode.clone();
        let was_work = ended_mode == "work";
        rt.snapshot.is_running = false;
        rt.snapshot.has_started = false;
        rt.end_time = None;
        rt.snapshot.time_left = 0;
        rt.pause_left = 0;
        serde_json::json!({
            "currentMode": ended_mode,
            "wasWorkMode": was_work,
        })
    };
    let _ = app.emit("pomodoro:timerEnded", payload.clone());
    let session_payload = {
        let rt = state.pomodoro.lock().unwrap();
        serde_json::json!({
            "currentMode": payload["currentMode"],
            "wasWorkMode": payload["wasWorkMode"],
            "completedPomodoros": rt.snapshot.completed_pomodoros,
        })
    };
    let _ = app.emit("pomodoro:sessionComplete", session_payload);
    broadcast(app);
    crate::tray::refresh(app);
}

pub fn action(app: &tauri::AppHandle, action: &str) {
    match action {
        "toggle" => {
            let running = app
                .state::<crate::state::AppState>()
                .pomodoro
                .lock()
                .unwrap()
                .snapshot
                .is_running;
            if running {
                pause(app)
            } else {
                start(app)
            }
        }
        "start" => start(app),
        "pause" => pause(app),
        "reset" => reset(app),
        "skip" => skip(app),
        "switchWork" => switch_mode(app, "work"),
        "switchShortBreak" => switch_mode(app, "shortBreak"),
        "switchLongBreak" => switch_mode(app, "longBreak"),
        _ => {}
    }
}

pub fn set_duration(app: &tauri::AppHandle, mode: &str, minutes: i64) {
    let mode = if matches!(mode, "work" | "shortBreak" | "longBreak") {
        mode.to_string()
    } else {
        return;
    };
    let clamped = minutes.clamp(1, 180) * 60;
    let state = app.state::<crate::state::AppState>();
    {
        let mut rt = state.pomodoro.lock().unwrap();
        rt.durations.insert(mode.clone(), clamped);
        let is_current = rt.snapshot.current_mode == mode;
        if !rt.snapshot.is_running && is_current {
            rt.pause_left = clamped;
        }
    }
    broadcast(app);
}

/// 后台 1Hz tick 线程；与 Electron setInterval(pomodoroTick, 1000) 等价
pub fn spawn_timer(app: tauri::AppHandle) {
    std::thread::Builder::new()
        .name("pomodoro-tick".into())
        .spawn(move || loop {
            std::thread::sleep(std::time::Duration::from_millis(1000));
            tick(&app);
        })
        .ok();
}

pub fn snapshot_of(app: &tauri::AppHandle) -> PomodoroSnapshot {
    let state = app.state::<crate::state::AppState>();
    let mut rt = state.pomodoro.lock().unwrap();
    refresh(&mut rt);
    rt.snapshot.clone()
}
