/**
 * SSH Service — singleton connection manager
 * Uses @dylankenneally/react-native-ssh-sftp (native Android/iOS SSH implementation)
 *
 * SECURITY NOTE: This service ONLY operates on the remote comma device.
 * It has NO access to the phone's local filesystem except the App sandbox.
 * All remote file operations go through SFTP to the remote device.
 */

export interface SSHConnectOptions {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export interface SFTPEntry {
  filename: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
  permissions: number;
}

export interface CanMessage {
  id: string;
  data: string;
  channel: string;
  timestamp: number;
  dlc?: number;
}

type SSHEventType = 'connected' | 'disconnected' | 'error';
type SSHListener = (...args: any[]) => void;

class SSHService {
  private client: any = null;
  private connected = false;
  private connecting = false;
  private sftpConnected = false;
  private shellOpen = false;
  private listeners: Map<SSHEventType, SSHListener[]> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  get isConnected() {
    return this.connected;
  }

  get isConnecting() {
    return this.connecting;
  }

  // ─── Simple Event Emitter (no Node.js dependency) ─────────────────────────

  on(event: SSHEventType, listener: SSHListener): this {
    const arr = this.listeners.get(event) || [];
    arr.push(listener);
    this.listeners.set(event, arr);
    return this;
  }

  off(event: SSHEventType, listener: SSHListener): this {
    const arr = this.listeners.get(event) || [];
    this.listeners.set(event, arr.filter(l => l !== listener));
    return this;
  }

  once(event: SSHEventType, listener: SSHListener): this {
    const wrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  private emit(event: SSHEventType, ...args: any[]): void {
    const arr = this.listeners.get(event) || [];
    arr.forEach(l => {
      try { l(...args); } catch (_) {}
    });
  }

  // ─── Heartbeat ────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    let consecutiveFailures = 0;
    this.heartbeatTimer = setInterval(async () => {
      if (!this.connected || !this.client) {
        this.stopHeartbeat();
        return;
      }
      try {
        await this.exec('echo 1');
        consecutiveFailures = 0;
      } catch (_) {
        consecutiveFailures++;
        if (consecutiveFailures >= 2) {
          // Connection lost
          this.stopHeartbeat();
          this.connected = false;
          this.connecting = false;
          this.sftpConnected = false;
          this.shellOpen = false;
          this.client = null;
          this.emit('disconnected');
        }
      }
    }, 8000); // Check every 8 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ─── Connection ────────────────────────────────────────────────────────────

  async connect(options: SSHConnectOptions): Promise<void> {
    if (this.connected || this.connecting) {
      await this.disconnect();
    }

    this.connecting = true;

    try {
      const mod = require('@dylankenneally/react-native-ssh-sftp');
      const SSHClient = mod?.default ?? mod;

      if (options.privateKey) {
        this.client = await SSHClient.connectWithKey(
          options.host,
          options.port,
          options.username,
          options.privateKey,
          options.passphrase || ''
        );
      } else {
        this.client = await SSHClient.connectWithPassword(
          options.host,
          options.port,
          options.username,
          options.password || ''
        );
      }

      this.connected = true;
      this.connecting = false;
      this.startHeartbeat();
      this.emit('connected');
    } catch (err: any) {
      this.connected = false;
      this.connecting = false;
      this.client = null;
      this.emit('error', err.message || '连接失败');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.client) {
      try {
        if (this.shellOpen) {
          await this.client.closeShell();
          this.shellOpen = false;
        }
        if (this.sftpConnected) {
          await this.client.disconnectSFTP();
          this.sftpConnected = false;
        }
        this.client.disconnect();
      } catch (_) {}
      this.client = null;
    }
    this.connected = false;
    this.connecting = false;
    this.sftpConnected = false;
    this.shellOpen = false;
    this.emit('disconnected');
  }

  // ─── Shell / Terminal ──────────────────────────────────────────────────────

  async openShell(
    onData: (data: string) => void,
    onClose?: () => void
  ): Promise<(data: string) => void> {
    if (!this.connected || !this.client) {
      throw new Error('未连接设备');
    }

    // If shell already open, just re-register listener
    if (this.shellOpen) {
      this.client.removeAllListeners('Shell');
      this.client.on('Shell', (event: string | null) => {
        if (event) onData(event);
      });
      return (input: string) => this.writeToShell(input);
    }

    // Start shell with fallback shell types
    try {
      await this.client.startShell('xterm');
    } catch (err) {
      console.warn('xterm shell failed, trying bash:', err);
      try {
        await this.client.startShell('bash');
      } catch (err2) {
        console.warn('bash shell failed, trying sh:', err2);
        await this.client.startShell('sh');
      }
    }
    this.shellOpen = true;

    const shellListener = (event: string | null) => {
      if (event) onData(event);
    };
    this.client.on('Shell', shellListener);

    // Watch for disconnect to notify shell close
    const disconnectHandler = () => {
      this.shellOpen = false;
      if (this.client) this.client.removeListener('Shell', shellListener);
      onClose?.();
    };
    this.once('disconnected', disconnectHandler);

    return (input: string) => this.writeToShell(input);
  }

  async writeToShell(input: string): Promise<void> {
    if (!this.client || !this.shellOpen) return;
    try {
      await this.client.writeToShell(input);
    } catch (err) {
      console.warn('Shell write error:', err);
    }
  }

  async closeShell(): Promise<void> {
    if (!this.client || !this.shellOpen) return;
    try {
      await this.client.closeShell();
    } catch (_) {}
    this.shellOpen = false;
  }

  // ─── Execute Command ───────────────────────────────────────────────────────

  async exec(command: string): Promise<string> {
    if (!this.connected || !this.client) {
      throw new Error('未连接设备');
    }
    try {
      const result = await this.client.execute(command);
      return result || '';
    } catch (err: any) {
      throw new Error(err.message || 'Command execution failed');
    }
  }

  // ─── SFTP ──────────────────────────────────────────────────────────────────

  private async ensureSFTP(): Promise<void> {
    if (this.sftpConnected) return;
    if (!this.connected || !this.client) throw new Error('Not connected');
    await this.client.connectSFTP();
    this.sftpConnected = true;
  }

  async listDir(path: string): Promise<SFTPEntry[]> {
    await this.ensureSFTP();
    const items: any[] = await this.client.sftpLs(path);

    return (items || []).map((item: any) => ({
      filename: item.filename || item.name || '',
      isDirectory: item.isDirectory ?? false,
      size: item.fileSize ?? item.size ?? 0,
      mtime: item.modificationDate ?? item.mtime ?? 0,
      permissions: item.permissions ?? 0,
    })).sort((a: SFTPEntry, b: SFTPEntry) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.filename.localeCompare(b.filename);
    });
  }

  async readFile(remotePath: string): Promise<string> {
    return this.exec(`cat "${remotePath}"`);
  }

  async writeFile(remotePath: string, content: string): Promise<void> {
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")
      .replace(/\n/g, '\\n');
    await this.exec(`printf '%b' '${escaped}' > "${remotePath}"`);
  }

  async downloadFile(remotePath: string, localDir: string): Promise<string> {
    await this.ensureSFTP();
    const dir = localDir.endsWith('/') ? localDir : localDir + '/';
    const downloaded = await this.client.sftpDownload(remotePath, dir);
    return downloaded;
  }

  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    await this.ensureSFTP();
    const remoteDir = remotePath.endsWith('/') ? remotePath : remotePath.substring(0, remotePath.lastIndexOf('/') + 1);
    await this.client.sftpUpload(localPath, remoteDir);
  }

  async deleteFile(remotePath: string): Promise<void> {
    await this.ensureSFTP();
    await this.client.sftpRm(remotePath);
  }

  async deleteDir(remotePath: string): Promise<void> {
    await this.ensureSFTP();
    await this.client.sftpRmdir(remotePath);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.ensureSFTP();
    await this.client.sftpRename(oldPath, newPath);
  }

  async mkdir(remotePath: string): Promise<void> {
    await this.ensureSFTP();
    await this.client.sftpMkdir(remotePath);
  }

  // ─── Device Info ───────────────────────────────────────────────────────────

  async getDeviceModel(): Promise<'comma2' | 'comma3' | 'comma3x' | 'comma4' | 'unknown'> {
    try {
      // Use openpilot Python API to get device model
      const output = await this.exec('python3 -c "from system.hardware import HARDWARE; print(type(HARDWARE).__name__)" 2>/dev/null');
      const model = output.trim().toLowerCase();
      
      // Map openpilot hardware class names to device models
      if (model.includes('comma4') || model === 'mici') return 'comma4';
      if (model.includes('comma3x') || model === 'tizi') return 'comma3x';
      if (model.includes('comma3') || model === 'tici') return 'comma3';
      if (model.includes('comma2') || model === 'neo') return 'comma2';
      
      // Fallback: try to detect based on device tree or CPU info
      try {
        const hwinfo = await this.exec('cat /proc/device-tree/model 2>/dev/null || cat /proc/cpuinfo 2>/dev/null');
        const lower = hwinfo.toLowerCase();
        if (lower.includes('comma4') || lower.includes('mici')) return 'comma4';
        if (lower.includes('comma3x') || lower.includes('tizi')) return 'comma3x';
        if (lower.includes('comma3') || lower.includes('tici')) return 'comma3';
        if (lower.includes('comma2') || lower.includes('neo')) return 'comma2';
      } catch (_) {}
      
      return 'unknown';
    } catch (err) {
      console.warn('getDeviceModel error:', err);
      return 'unknown';
    }
  }

  async getDeviceInfo(): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    try {
      const combined = [
        `echo "___T___" && cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0"`,
        `echo "___F___" && (find /sys/class/hwmon -name 'fan*_input' 2>/dev/null | head -1 | xargs cat 2>/dev/null || cat /sys/class/hwmon/hwmon0/fan1_input 2>/dev/null || cat /sys/class/hwmon/hwmon1/fan1_input 2>/dev/null || cat /sys/class/hwmon/hwmon2/fan1_input 2>/dev/null || cat /sys/devices/platform/soc/*/hwmon/hwmon*/fan1_input 2>/dev/null || echo "0")`,
        `echo "___U___" && uptime -p 2>/dev/null || uptime`,
        `echo "___M___" && cat /proc/meminfo`,
        `echo "___D___" && df -k /data 2>/dev/null | tail -1 || df -k / | tail -1`,
        `echo "___C___" && top -bn1 2>/dev/null | grep -i "cpu" | head -1 || echo "0"`,
        `echo "___G___" && (cat /sys/class/kgsl/kgsl-3d0/gpu_busy_percentage 2>/dev/null || cat /sys/class/devfreq/*/gpu_busy_percentage 2>/dev/null || cat /sys/kernel/gpu/gpu_busy 2>/dev/null || echo "N/A")`,
        `echo "___V___" && cat /VERSION 2>/dev/null || echo "unknown"`,
        `echo "___B___" && (getprop ro.build.version.release 2>/dev/null || uname -r)`,
        `echo "___H___" && hostname`,
        `echo "___A___" && (getprop ro.hardware 2>/dev/null | grep -E '^(tici|tizi|mici|neo|eon)$' || PYTHONPATH=/data/openpilot python3 -c "from system.hardware import HARDWARE; print(type(HARDWARE).__name__.lower())" 2>/dev/null || cat /proc/device-tree/model 2>/dev/null | tr -d '\\0' | head -c 64 || echo "")`,
        `echo "___END___"`,
      ].join('; ');

      const output = await this.exec(combined);
      console.log('[SSH DEBUG] Raw output:', output);

      const extract = (marker: string, nextMarker: string) => {
        const markerStr = `___${marker}___`;
        const start = output.indexOf(markerStr);
        if (start === -1) {
          console.log(`[SSH DEBUG] Marker ${marker} not found`);
          return '';
        }
        const nextMarkerStr = nextMarker ? `___${nextMarker}___` : '___END___';
        const end = output.indexOf(nextMarkerStr, start + markerStr.length);
        const value = end === -1 ? output.substring(start + markerStr.length).trim() : output.substring(start + markerStr.length, end).trim();
        console.log(`[SSH DEBUG] Marker ${marker}: start=${start}, end=${end}, value="${value}"`);
        return value;
      };

      const markers = ['T', 'F', 'U', 'M', 'D', 'C', 'G', 'V', 'B', 'H', 'A'];
      const keys = ['temperature', 'fanRpm', 'uptime', 'memInfo', 'diskInfo', 'cpuUsage', 'gpuUsage', 'systemVersion', 'buildNumber', 'hostname', 'architecture'];
      markers.forEach((m, i) => {
        const nextMarker = markers[i + 1];
        const value = extract(m, nextMarker);
        results[keys[i]] = value;
      });
      
      console.log('[SSH DEBUG] Final results:', results);

      // Normalize temperature (some devices report in millidegrees)
      if (results.temperature) {
        const temp = parseFloat(results.temperature);
        if (!isNaN(temp) && temp > 1000) {
          results.temperature = (temp / 1000).toFixed(1);
        }
      }

      // Normalize fan RPM
      if (results.fanRpm) {
        const rpm = parseInt(results.fanRpm, 10);
        if (!isNaN(rpm)) {
          results.fanRpm = String(rpm);
        }
      }

      // Normalize GPU usage
      if (results.gpuUsage && results.gpuUsage !== 'N/A') {
        const gpuMatch = results.gpuUsage.match(/(\d+)/);
        if (gpuMatch) {
          results.gpuUsage = gpuMatch[1] + '%';
        }
      }
    } catch (err) {
      console.warn('[SSH DEBUG] getDeviceInfo error:', err);
      results['_error'] = String(err);
    }
    return results;
  }

  // ─── Log Streaming ─────────────────────────────────────────────────────────

  async streamLogs(
    onLine: (line: string) => void,
    onError?: (err: string) => void
  ): Promise<() => void> {
    if (!this.connected || !this.client) {
      throw new Error('未连接设备');
    }

    let running = true;
    const seenLines = new Set<string>();

    const poll = async () => {
      let isFirstRun = true;
      while (running && this.connected) {
        try {
          // Priority: openpilot logs > logcat > journalctl > syslog
          const cmd = isFirstRun
            ? `(tail -n 100 /data/log/swaglog.kjson 2>/dev/null || tail -n 100 /tmp/log/swaglog.kjson 2>/dev/null || logcat -d -t 100 2>/dev/null || journalctl -n 100 --no-pager -o short 2>/dev/null || tail -n 50 /var/log/syslog 2>/dev/null) | tail -n 50`
            : `(tail -n 50 /data/log/swaglog.kjson 2>/dev/null || tail -n 50 /tmp/log/swaglog.kjson 2>/dev/null || logcat -d -t 50 2>/dev/null || journalctl -n 50 --no-pager -o short 2>/dev/null || tail -n 30 /var/log/syslog 2>/dev/null) | tail -n 30`;

          const output = await this.exec(cmd);
          if (output) {
            const lines = output.split('\n').filter(Boolean);
            lines.forEach(line => {
              const lineHash = line.substring(0, 80);
              if (!seenLines.has(lineHash)) {
                seenLines.add(lineHash);
                onLine(line);
              }
            });
            if (seenLines.size > 500) {
              const arr = Array.from(seenLines);
              arr.slice(0, -200).forEach(h => seenLines.delete(h));
            }
          }
          isFirstRun = false;
        } catch (err: any) {
          if (running) onError?.(err.message);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    };

    poll();
    return () => { running = false; };
  }

  // ─── CAN Data Capture (using openpilot dump.py / candump) ───────────────────

  async startCanCapture(
    onMessage: (msg: CanMessage) => void,
    onError?: (err: string) => void
  ): Promise<() => void> {
    if (!this.connected || !this.client) {
      throw new Error('未连接设备');
    }

    let running = true;

    // Parse a CAN line and call onMessage; returns true if a message was emitted
    const parseLine = (line: string, idx: number): boolean => {
      const t = Date.now() + idx;

      // openpilot dump.py format: "(Bus N) 0xABC [DLC]: XX XX XX XX"
      const busMatch = line.match(/\(Bus\s+(\d+)\)\s+(0x[0-9A-Fa-f]+)\s+\[(\d+)\]:\s*([0-9A-Fa-f ]+)/i);
      if (busMatch) {
        const dataHex = busMatch[4].replace(/\s+/g, '').toUpperCase();
        onMessage({ channel: `can${busMatch[1]}`, id: busMatch[2].replace('0x','').replace(/^0+/,'').toUpperCase() || '0', data: dataHex, dlc: parseInt(busMatch[3], 10), timestamp: t });
        return true;
      }

      // candump format: "can0  123   [8]  01 02 03 04 05 06 07 08" or "can0  123#0102..."
      const candumpSpaceMatch = line.match(/^\s*(\S+)\s+([0-9A-Fa-f]+)\s+\[(\d+)\]\s+([0-9A-Fa-f ]+)/);
      if (candumpSpaceMatch) {
        const dataHex = candumpSpaceMatch[4].replace(/\s+/g, '').toUpperCase();
        onMessage({ channel: candumpSpaceMatch[1], id: candumpSpaceMatch[2].toUpperCase(), data: dataHex, dlc: parseInt(candumpSpaceMatch[3], 10), timestamp: t });
        return true;
      }
      const candumpHashMatch = line.match(/^\s*(\S+)\s+([0-9A-Fa-f]+)#([0-9A-Fa-f]*)/);
      if (candumpHashMatch) {
        onMessage({ channel: candumpHashMatch[1], id: candumpHashMatch[2].toUpperCase(), data: candumpHashMatch[3].toUpperCase(), dlc: Math.floor(candumpHashMatch[3].length / 2), timestamp: t });
        return true;
      }

      // Generic hex format: "can0 0x123 AABBCCDD"
      const hexMatch = line.match(/^(\S+)\s+(0x[0-9A-Fa-f]+)\s+([0-9A-Fa-f]+)/);
      if (hexMatch) {
        onMessage({ channel: hexMatch[1], id: hexMatch[2].replace('0x','').toUpperCase(), data: hexMatch[3].toUpperCase(), dlc: Math.floor(hexMatch[3].length / 2), timestamp: t });
        return true;
      }

      // cereal/dump.py format: "address: NNN  dat: 'HEXSTR'  src: N  bus: N"
      const cerealMatch = line.match(/address:\s*(\d+).*dat:\s*["']?([0-9A-Fa-f]+)/i);
      const busCerealMatch = line.match(/bus:\s*(\d+)/i);
      if (cerealMatch) {
        const decId = parseInt(cerealMatch[1], 10);
        onMessage({ channel: busCerealMatch ? `can${busCerealMatch[1]}` : 'can0', id: decId.toString(16).toUpperCase(), data: cerealMatch[2].toUpperCase(), dlc: Math.floor(cerealMatch[2].length / 2), timestamp: t });
        return true;
      }

      // Simple "ID HEXDATA" format
      const simpleMatch = line.match(/^\s*([0-9A-Fa-f]{1,8})\s+([0-9A-Fa-f]{2,16})\s*$/);
      if (simpleMatch) {
        const decId = parseInt(simpleMatch[1], 16);
        onMessage({ channel: 'can0', id: decId.toString(16).toUpperCase(), data: simpleMatch[2].toUpperCase(), dlc: Math.floor(simpleMatch[2].length / 2), timestamp: t });
        return true;
      }

      return false;
    };

    const poll = async () => {
      while (running && this.connected) {
        try {
          let output = '';
          let hasRealData = false;

          // Method 1: openpilot dump.py — try multiple known paths
          const dumpPaths = [
            '/data/openpilot/selfdrive/debug/dump.py',
            '/data/openpilot/tools/lib/logreader.py',
          ];
          for (const dp of dumpPaths) {
            if (!running) break;
            try {
              const out = await this.exec(
                `timeout 2 python3 "${dp}" can 2>/dev/null | head -50`
              );
              if (out && out.trim() && !out.toLowerCase().includes('error') && !out.toLowerCase().includes('traceback') && out.trim() !== 'NO_CAN') {
                output = out;
                hasRealData = true;
                break;
              }
            } catch (_) {}
          }

          // Method 2: cereal messaging direct Python snippet
          if (!hasRealData && running) {
            try {
              const cereallOut = await this.exec(
                `timeout 2 python3 -c "
import sys, time
sys.path.insert(0,'/data/openpilot')
try:
  import cereal.messaging as messaging
  sm = messaging.SubMaster(['can'])
  sm.update(1500)
  for msg in sm['can']:
    data = bytes(msg.dat).hex().upper()
    print(f'(Bus {msg.src}) 0x{msg.address:03X} [{msg.dat.size}]: {\" \".join([data[i:i+2] for i in range(0,len(data),2)])}')
except Exception as e:
  print('ERR:' + str(e), file=sys.stderr)
" 2>/dev/null | head -50`
              );
              if (cereallOut && cereallOut.trim() && !cereallOut.includes('ERR:') && cereallOut.trim() !== '') {
                output = cereallOut;
                hasRealData = true;
              }
            } catch (_) {}
          }

          // Method 3: candump (SocketCAN)
          if (!hasRealData && running) {
            try {
              const candumpOut = await this.exec(`timeout 1 candump -n 30 any 2>/dev/null`);
              if (candumpOut && candumpOut.trim() && !candumpOut.trim().startsWith('No')) {
                output = candumpOut;
                hasRealData = true;
              }
            } catch (_) {}
          }

          if (hasRealData && output) {
            const lines = output.split('\n').filter(l => l.trim().length > 0);
            lines.forEach((line, idx) => parseLine(line, idx));
          } else {
            // No real CAN data available — report status but don't emit fake messages
            if (running) onError?.('暂无 CAN 数据（车辆未接入或 openpilot 服务未运行）');
          }
        } catch (err: any) {
          if (running) onError?.(err.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    };

    poll();
    return () => { running = false; };
  }

  /**
   * Capture screen from device framebuffer
   * Returns base64-encoded PNG image
   * Supports both Android (screencap) and agnos/openpilot systems
   */
  async captureScreen(): Promise<string> {
    if (!this.connected || !this.client) {
      throw new Error('未连接设备');
    }
    try {
      await this.ensureSFTP();
      const screenshotPath = '/tmp/screenshot.png';
      
      // Try multiple methods to capture screen
      const methods = [
        // Method 1: Android screencap
        `screencap -p ${screenshotPath}`,
        // Method 2: ffmpeg from framebuffer (agnos/Linux)
        `ffmpeg -f fbdev -i /dev/fb0 -vframes 1 -f image2 ${screenshotPath} 2>/dev/null`,
        // Method 3: Direct framebuffer copy with ImageMagick
        `convert -size 1080x1920 -depth 8 rgba:/dev/fb0 ${screenshotPath} 2>/dev/null || true`,
      ];
      
      let success = false;
      for (const method of methods) {
        try {
          await this.exec(method);
          // Check if file was created
          try {
            const stat = await this.client.sftpStat(screenshotPath);
            if (stat && stat.size > 0) {
              success = true;
              break;
            }
          } catch (e) {
            // File might not exist yet
          }
        } catch (e) {
          // Try next method
          continue;
        }
      }
      
      if (!success) {
        throw new Error('No screen capture method available');
      }
      
      // Read the screenshot file and convert to base64
      const fileData = await this.client.sftpReadFile(screenshotPath);
      
      // Convert to base64
      const base64 = Buffer.from(fileData).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (err: any) {
      throw new Error(`Failed to capture screen: ${err.message}`);
    }
  }

  /**
   * Send touch event to device
   * @param x X coordinate
   * @param y Y coordinate
   */
  async sendTouchEvent(x: number, y: number): Promise<void> {
    if (!this.connected || !this.client) {
      throw new Error('未连接设备');
    }
    try {
      // Use input command to send touch events
      // Format: input touchscreen tap <x> <y>
      await this.exec(`input touchscreen tap ${Math.floor(x)} ${Math.floor(y)}`);
    } catch (err: any) {
      throw new Error(`Failed to send touch event: ${err.message}`);
    }
  }
}

export const sshService = new SSHService();
