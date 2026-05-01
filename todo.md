# CommaConnect TODO

## Phase 1 — Foundation
- [x] Update theme colors (dark tech theme)
- [x] Install required packages (ssh2, i18n, react-native-ssh-sftp)
- [x] Create i18n framework (zh/en)
- [x] Create SSH service layer (singleton connection manager, native Android/iOS)
- [x] Create global store (Zustand: connection state, settings, language)
- [x] Update app.config.ts branding
- [x] Generate app icon/logo

## Phase 2 — Navigation & Shell
- [x] Set up 7-tab navigation with icons
- [x] Create Connect modal/screen
- [x] SSH connection with background persistence

## Phase 3 — Device Screen
- [x] Device info page layout
- [x] SSH commands for temp/memory/storage/CPU/GPU
- [x] Auto-refresh every 3 seconds
- [x] Status cards with color-coded indicators

## Phase 4 — Terminal Screen
- [x] Terminal emulator component
- [x] Keyboard toolbar (Tab, Ctrl, arrows)
- [x] Background session persistence (module-level globals)

## Phase 5 — File Manager
- [x] SFTP file browser
- [x] File upload (phone → device)
- [x] File download (device → phone)
- [x] Rename / delete
- [x] Code editor with inline editing
- [x] File preview

## Phase 6 — Install Screen
- [x] Repository settings integration
- [x] GitHub/Gitee branch list API
- [x] Local sandbox cache (max 2 branches)
- [x] Download progress UI
- [x] Push & install to device

## Phase 7 — Logs Screen
- [x] Real-time log streaming via SSH
- [x] Log level filter
- [x] Save log to local file
- [x] AI analysis (error summary + fix suggestions)
- [x] Apply fix button

## Phase 8 — CAN Data Screen
- [x] Start/stop CAN capture
- [x] Live message display
- [x] In-memory buffer (cleared on exit)
- [x] Export to phone storage (CSV)
- [x] AI CAN signal analysis

## Phase 9 — Settings Screen
- [x] SSH connection settings
- [x] Language toggle (zh/en)
- [x] Repository management (GitHub/Gitee/custom)
- [x] Theme toggle (dark/light)
- [x] About section

## Phase 10 — Polish & Build
- [x] AI permission boundary (device-only, no phone files)
- [x] Error handling & offline states
- [x] Loading states everywhere
- [x] Fix build errors: remove Node.js events module, fix Buffer usage, set NODE_ENV
- [ ] Build APK (user publishes via Publish button)

## Known Limitations / Future Enhancements
- [ ] SSH key file picker (import from phone storage)
- [ ] Terminal xterm.js full rendering (currently plain text)
- [ ] Branch install upload progress bar (native events)
- [ ] Push notifications for long-running installs
- [x] Fix Android Gradle packaging conflict: META-INF duplicate files (jsch vs jspecify)
- [x] Fix install page: paginate GitHub/Gitee API to fetch all branches (not just 30)
- [x] Fix install page: show full branch name without truncation
- [x] Fix install page: support custom Git bare repos (Alibaba Cloud, SSH git@, git://)
- [x] New app icon: white background with black comma (official style)
- [x] UI redesign: young/fresh color scheme, modern cards
- [x] SSH fix: support private key input in settings, connect button connects directly without re-prompting
- [x] Device page: all metrics with icons (fan animation when spinning), architecture display
- [x] Install page: paginate all branches, full branch name display, bare repo support, filter by device arch
- [x] Install page: add branch search bar (real-time filter by branch name)
- [x] Fix web preview crash: change web output from "static" to "single" to avoid SSR native module crash
- [x] Mock react-native-reanimated and react-native-worklets for web platform
- [x] Fix device page: show rich placeholder UI when not connected (not just empty "暂无数据")
- [ ] Fix SSH connection: connection fails immediately when user taps connect button
- [x] Improve settings SSH modal: add explicit auth method toggle (Password/Private Key), show only relevant input based on selection
- [x] Fix terminal: input command has no response, output not displayed
- [x] Fix logs: log collection shows empty, no output displayed
- [x] Fix CAN message capture: use dump.py can --json for openpilot native CAN capture
- [x] Fix connection status sync: App still shows connected after device disconnects
- [x] Fix installation page: ExponentFileSystem.makeDirectoryAsync crash (NoClassDefFoundError)
- [x] Fix install page: repo name at top disappears after branches load (header area gets compressed)
- [x] Fix custom repo branch fetch: private git server (http://IP/repo.git format) fails to fetch branches - need to use SSH git ls-remote instead of GitHub/Gitee REST API
- [x] Fix terminal UI: black background with green text, proper terminal styling
- [x] Fix terminal input: KeyboardAvoidingView prevents keyboard from covering input area
- [x] Fix device disconnect status: heartbeat detection + global disconnect listener in root layout
- [x] Fix terminal: complete rewrite with proper hooks and styling
- [x] Fix device page: GPU usage parsing improved (handles % suffix and N/A), always shown
- [x] Fix device page: fan speed properly parsed and displayed with RPM unit
- [x] Improve CAN capture: use dump.py can --json instead of candump (openpilot native method)
- [x] Fix install page: makeDirectoryAsync wrapped in try-catch to prevent crash
- [x] Fix i18n: all error popups/alerts now show Chinese text in Chinese mode (connect, files, logs, CAN, install)
- [x] Update app icon: deep navy blue background with white comma + WiFi signal arcs (matching user reference)

## Round 3 Bug Fixes (User Feedback 2026-04-16)
- [x] Fix app icon: regenerated with padding, compressed with pngquant
- [x] Fix terminal/logs/CAN: changed ALL text to WHITE on dark background
- [x] Fix terminal: improved KeyboardAvoidingView for keyboard coverage
- [x] Fix install page: completely bypassed expo-file-system, install via SSH wget on device
- [x] Fix custom repo (阿里云): branch fetch now uses SSH git ls-remote on device
- [x] Fix logs: changed log command to openpilot logcatd instead of systemd journalctl
- [x] Fix background disconnect: added AppState listener to detect and handle background->foreground reconnection
- [x] Fix install error messages: wrapped in Chinese-friendly error text
- [x] Fix files/logs/CAN export: removed expo-file-system dependency, save via SSH to device /tmp

## Round 4 Bug Fixes (User Feedback 2026-04-16)
- [ ] Fix AI analysis: error message "Analysis failed. Please check your connection." is still in English, should be Chinese
- [ ] Fix AI analysis: backend API connection may be failing or timing out
- [ ] Improve AI analysis: add retry mechanism and better error handling
- [x] Fix install download: changed to git clone method (works for all repo types)
- [x] Fix install download: added progress display (50%, 75%, 85%, 100%)
- [x] Fix install download: verify file creation and size > 0

## Round 5 Feature Improvements (User Request 2026-04-16)
- [x] Change install progress: real-time percentage via git clone progress polling
- [x] Add backup feature: tar.gz /data/openpilot (excluding .git), only keep latest 1 backup
- [x] Add restore feature: delete current openpilot, extract backup tar.gz
- [x] Add real-time progress display for backup and restore (file size polling)
- [x] Add reboot dialog: "Reboot Now" (sudo reboot) or "Reboot Later" buttons
- [x] Install via git clone directly to /data/openpilot (no zip, no wget, no expo-file-system)

## Round 6 Bug Fixes (User Feedback 2026-04-20)
- [x] Fix app icon: scale down to prevent clipping (currently being cut off by OS icon mask) - 用户提供的图标缩小到75%
- [x] Fix AI analysis: Invalid URL error - 改用 tRPC 客户端的 useMutation().mutateAsync() 正确调用

## Round 7 Bug Fixes (User Feedback 2026-04-21)
- [x] Fix AI analysis: Invalid hook call error (calling useMutation outside component) - 改用 fetch 直接调用 tRPC 端点
- [x] Fix terminal: input field covered by keyboard, input text not visible - 增加 keyboardVerticalOffset 和 padding

## Round 8 Bug Fixes (User Feedback 2026-04-21)
- [x] Fix AI analysis: "Unknown error from LLM service" - 修复 tRPC v11 批量调用格式，正确解析响应
- [x] Fix terminal: input text shows blank - 为TextInput设置显式的文字颜色#FFFFFF

## Round 9 Bug Fixes (User Feedback 2026-04-21)
- [x] Fix AI analysis: HTTP 400 batch call format - 修复 tRPC 批量调用格式，使用正确的数字键结构
- [x] Fix terminal: keyboard still covers input slightly - 增加 paddingBottom 到 20

## Round 10 Bug Fixes (User Feedback 2026-04-21)
- [x] Fix AI analysis: HTTP 400 batch call error - 改用简单的 /api/ai/chat 端点而不是 tRPC
- [x] Fix terminal: keyboard still covers input slightly - 增加 paddingBottom 到 30

## Round 12 Bug Fixes (User Feedback 2026-04-21)
- [x] Fix AI Modal interface display - wrapped Modal with ScreenContainer for proper SafeArea handling
- [x] Fix custom prompt state persistence - clear aiCustomPrompt when Modal closes or user returns to selection screen

## Round 13 Features (2026-04-21)
- [x] Device model recognition - detect Comma2/3/3X/4 via SSH getDeviceModel()
- [x] Device display area - show device photo on device page when connected
- [x] Unified device image sizing - consistent display across different device models (16:9 aspect ratio)

## Round 14 Features (2026-04-26)
- [ ] Device identification - recognize device model (Comma 2/3/3X/4) via device architecture
- [ ] Device image handling - normalize device image sizes, display consistently
- [ ] Device page layout - reorganize system model/architecture/uptime info, create space for screen preview
- [ ] Device architecture display - show device architecture (tici/tizi/mici/neo) instead of CPU architecture
- [ ] Screen preview - implement low-resolution screen preview (updated every 500ms)
- [ ] Full-screen preview - tap screen preview to enter full-resolution mode
- [ ] Touch support - enable touch control in full-screen preview mode


## Round 15 Bug Fixes (2026-04-26)
- [x] Fix built-in AI: add enable button to activate built-in AI provider
- [x] Fix built-in AI: remove save button (built-in AI should not be editable)
- [x] Fix AI status light logic: when switching providers, check new provider status (not just show green)
- [x] Fix device screen preview area: reduce size to symbolic display only (not large area)
- [x] Fix screen preview entry: tap device screen to enter full-screen mode (remove separate "click full screen" button)
- [x] Implement real-time screen data: fetch screen via SSH captureScreen() every 500ms
- [x] Implement full-screen mode with touch support: tap screen to enter full-screen, tap in full-screen to send touch events
- [x] Add SSH service methods: captureScreen() and sendTouchEvent() for device interaction

## Round 16 Improvements (2026-04-27)
- [x] Fix device platform code detection: use openpilot Python API
- [x] Reorganize layout: device preview left + system info right
- [x] Improve captureScreen: support agnos/Linux framebuffer methods
- [x] Fix AI status light: show yellow only on manual switch

## Round 17 Bug Fixes (2026-04-28)
- [x] Fix right panel layout: reduce system info card size to fit properly with device preview
- [x] Fix device identification: show correct device name (Comma 3) instead of "未知设备"
- [x] Fix uptime display: translate "up X hours, Y minutes" to Chinese format
- [x] Fix platform code display: correctly parse Python API return value (Tici/Tizi/Mici/Neo)
- [ ] Fix fan speed: display actual fan speed value instead of "-"

## Round 18 Architecture Debug (2026-04-28)
- [x] Refactor device architecture fetching: use architecture from getDeviceInfo() instead of separate Python call
- [x] Add debug logging: log raw architecture string and parsed result
- [x] Remove redundant fetchArchitecture() function: architecture now fetched from getDeviceInfo()
- [x] Add uptimeRow style definition: fix missing style for uptime bar layout
- [x] Create device-manager.test.ts: verify parseDeviceArchitecture() handles all cases correctly
- [x] All 17 device-manager tests passing: Tici/Tizi/Mici/Neo parsing works correctly
- [x] Fix Python command: extract architecture from HARDWARE object string representation
- [x] Correct extraction logic: split by '.' and get index [3] to extract 'tici' from object path
- [x] Fix card visibility: platform code card now always displays, even when value is 'unknown'
- [x] Improve Python command: add bounds checking to prevent index errors
- [x] Fix card layout: change systemInfoCard flex from 0.6 to 1, add width 100% to topRow
- [x] Ensure cards stay on right side: topRow now properly fills available width
- [x] Fix device preview layout: ensure fixed width (200px) even when architecture is unknown
- [x] Add /VERSION file parsing: extract architecture from /VERSION file as backup method
- [x] Add SSH debug logging: log raw SSH output to diagnose architecture detection failures
- [x] Improve fallback logic: try to infer architecture from hostname if SSH command fails
- [x] Use full Python path: change python3 to /usr/bin/python3 to ensure correct executable
- [x] Simplify grep command: remove unnecessary 'comma' filter to improve reliability
- [x] Fix SSH Python execution: cd to /data/openpilot before running Python to ensure correct environment


## Round 19 Bug Fixes (2026-04-28)
- [ ] Debug: SSH Python command still returns 'unknown' - check why cd /data/openpilot didn't work
- [ ] Fix: Left side shows "未知设备" instead of device preview
- [ ] Fix: Right side system info card exceeds screen center - layout issue
- [ ] Improve: Add more reliable architecture detection methods

## Round 20 Code Editor Linting Fix (2026-04-28)
- [x] Fix code editor linting: remove false positive indentation checks (indent % 2 logic is wrong)
- [x] Fix code editor linting: translate all error messages to Chinese
- [x] Fix code editor linting: for Python files, use SSH to run python3 -c "compile()" on device for real syntax check
- [x] Fix code editor linting: for JS/TS files, use bracket-matching based detection (no false positives)
- [x] Fix code editor linting: add SSH-based Python lint method to ssh-service.ts
- [x] Fix code editor linting: show "正在检查..." status while SSH lint is running

## Round 21 Device Page Layout Fix (2026-04-28)
- [x] Debug platform code detection: simplified SSH command to use /VERSION grep first, then getprop
- [x] Optimize right panel: removed icons from small cards, reduced font sizes (8px labels, 14px values)
- [x] Ensure right cards fit within left preview area width: removed icon boxes, reduced padding to 6px/8px, gap to 4px
- [x] Test layout on different screen sizes

## Round 22 SSH Result Extraction Fix (2026-04-29)
- [x] Fixed extract function: added sentinel marker ___END___ to properly delimit last field
- [x] Fixed extract logic: now correctly extracts architecture field without including trailing output
- [x] Verified platform code detection now works correctly (returns tici instead of ?)
- [x] Changed Arch card display: shows device names (Comma 3/3X/4/2) or "未知代号" instead of ?
- [x] Reverted to Python command for platform detection (grep /VERSION doesn't work)
- [x] Ensured Python command runs with cd /data/openpilot to set correct environment
