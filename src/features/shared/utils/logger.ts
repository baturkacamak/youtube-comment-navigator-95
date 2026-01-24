import { ENABLE_LOGGER } from './appConstants';

class Logger {
    prefix = "YouTube Comment Navigator 95";
    customFormat: { locale: string; hour12: boolean } | null = null;
    logHistory: Array<{ timestamp: string; level: string; message: string, data: any[] }> = [];
    filters: Set<string> = new Set();
    lastTimestamp: Date | null = null;
    persist = false;
    mock = false;
    private debugEnabled: boolean = false;
    maxLogHistory = 500; // Limit log history to prevent memory issues

    theme: Record<string, string> = {
        debug: "color: #3498db; font-weight: bold;",
        info: "color: #1abc9c; font-weight: bold;",
        warn: "color: #f39c12; font-weight: bold;",
        error: "color: #e74c3c; font-weight: bold;",
        success: "color: #2ecc71; font-weight: bold;",
        trace: "color: #8e44ad; font-weight: bold;",
        htmlTitle: "color: #9b59b6; font-weight: bold;",
        htmlContent: "color: #2c3e50;",
        toggle: "color: #f39c12; font-weight: bold;"
    };

    emojis: Record<string, string> = {
        debug: "🐛",
        info: "ℹ️",
        warn: "⚠️",
        error: "❌",
        success: "✅",
        trace: "📌",
        html: "🧩",
        toggle: "🎛️"
    };

    timers: Map<string, number> = new Map();

    start(label: string): void {
        this.timers.set(label, performance.now());
    }

    end(label: string): void {
        const start = this.timers.get(label);
        if (start != null) {
            const duration = performance.now() - start;
            this.info(`[TIMER] ${label} took ${duration.toFixed(2)}ms`);
            this.timers.delete(label);
        } else {
            this.warn(`[TIMER] No start time found for "${label}"`);
        }
    }

    setDebug(enable: boolean) {
        this.debugEnabled = enable;
    }

    setTimeFormat(locale: string = "en-US", use12Hour: boolean = false): void {
        this.customFormat = { locale, hour12: use12Hour };
    }

    detectTimeFormat(): { locale: string; hour12: boolean } {
        try {
            const testDate = new Date(Date.UTC(2020, 0, 1, 13, 0, 0));
            const locale = navigator.language || "tr-TR";
            const timeString = testDate.toLocaleTimeString(locale);
            const is12Hour = /am|pm/i.test(timeString);
            return { locale, hour12: is12Hour };
        } catch {
            return { locale: "tr-TR", hour12: false };
        }
    }

    timestamp(): string {
        const { locale, hour12 } = this.customFormat || this.detectTimeFormat();
        const now = new Date();
        const time = now.toLocaleString(locale, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12
        });

        let diff = "";
        if (this.lastTimestamp instanceof Date) {
            const ms = now.getTime() - this.lastTimestamp.getTime();
            diff = ` [+${(ms / 1000).toFixed(1)}s]`;
        }

        this.lastTimestamp = now;
        return `${time}${diff}`;
    }

    getCaller(): string {
        const err = new Error();
        const stack = err.stack?.split("\n")[3];
        return stack?.trim() || "(unknown)";
    }

    log(level: string, ...args: any[]): void {
        if (!ENABLE_LOGGER) return;
        if (!this.debug && level === "debug") return;
        if (this.filters.size && !args.some(arg => this.filters.has(String(arg)))) return;

        const emoji = this.emojis[level] || '';
        const style = this.theme[level] || '';
        const timestamp = this.timestamp();
        const caller = this.getCaller();

        const message = [
            `%c${timestamp} %c${emoji} [${this.prefix} ${level.toUpperCase()}]%c:`,
            "color: gray; font-style: italic;",
            style,
            "color: inherit;",
            ...args,
            `\nCaller: ${caller}`
        ];

        this.logHistory.push({ timestamp, level, message: args[0], data: args.slice(1) });
        if (this.logHistory.length > this.maxLogHistory) {
            this.logHistory.shift();
        }

        if (this.persist) localStorage.setItem("LoggerHistory", JSON.stringify(this.logHistory));
        if (this.mock) return;

        // Use detailed object logging for warns/errors with objects
        if ((level === 'warn' || level === 'error') && args.length > 1 && typeof args[1] === 'object' && args[1] !== null) {
            const [mainMessage, ...objects] = args;
            if (console && console.log) {
                 console.log(`%c${timestamp} %c${emoji} [${this.prefix} ${level.toUpperCase()}]%c: ${mainMessage}`, "color: gray; font-style: italic;", style, "color: inherit;");
            }
            objects.forEach(obj => this._logDetailedObject(level, obj));
            if (console && console.log) {
                 console.log(`%cCaller: ${caller}`, 'color: gray; font-style: italic;');
            }
        } else {
            if (console && console.log) {
                 console.log(...message);
            }
        }
    }

    debug(...args: any[]): void { this.log("debug", ...args); }
    info(...args: any[]): void { this.log("info", ...args); }
    warn(...args: any[]): void { this.log("warn", ...args); }
    error(...args: any[]): void { this.log("error", ...args); }
    success(...args: any[]): void { this.log("success", ...args); }
    trace(...args: any[]): void {
        this.log("trace", ...args);
        console.trace();
    }

    logHtml(title: string, htmlContent: string): void {
        const shortContent = htmlContent.substring(0, 1500) + "...";
        this.log("html", `[${title}]`, shortContent);
        if (!this.mock) {
            console.groupCollapsed(`%c🧩 HTML Details (${title})`, this.theme.htmlTitle);
            console.log("%cComplete HTML:", this.theme.htmlTitle);
            console.log(`%c${htmlContent}`, this.theme.htmlContent);
            console.groupEnd();
        }
    }

    setPrefix(prefix: string): void { this.prefix = prefix; }
    setTheme(theme: Record<string, string>): void { Object.assign(this.theme, theme); }
    addFilter(tag: string): void { this.filters.add(tag); }
    clearFilters(): void { this.filters.clear(); }
    persistLogs(enable: boolean = true): void { this.persist = enable; }
    mockLogs(enable: boolean = true): void { this.mock = enable; }
    group(label: string): void { if (!this.mock) console.group(label); }
    groupEnd(): void { if (!this.mock) console.groupEnd(); }
    step(msg: string): void { this.info(`✅ ${msg}`); }
    hello(): void { this.info("Hello, dev! 👋 Ready to debug?"); }

    downloadLogs(filename: string = "logs.json"): void {
        const blob = new Blob([JSON.stringify(this.logHistory, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    autoClear(intervalMs: number): void {
        setInterval(() => {
            this.logHistory = [];
            if (this.persist) localStorage.removeItem("LoggerHistory");
        }, intervalMs);
    }

    /**
     * Formats and logs an object with detailed, collapsible sections.
     * Inspired by the more robust LoggingService from another project.
     * @param level The log level ('warn' or 'error')
     * @param data The object to log.
     */
    private _logDetailedObject(level: 'warn' | 'error', data: any): void {
        const isError = level === 'error';
        const prefix = isError ? '🔴' : '⚠️';
        const groupLabel = `%c${prefix} Detailed ${level.toUpperCase()} Information`;
        const style = isError ? this.theme.error.replace('bold', 'normal') : this.theme.warn.replace('bold', 'normal');

        if (console && console.groupCollapsed) {
            console.groupCollapsed(groupLabel, style);
        } else if (console && console.log) {
            console.log(groupLabel);
        }

        if (typeof data === 'object' && data !== null) {
            Object.entries(data).forEach(([key, value]) => {
                const keyStyle = 'color: #6b7280; font-weight: bold;';
                const valueStyle = 'color: inherit; font-weight: normal;';

                if (key.toLowerCase().includes('stack') && typeof value === 'string') {
                    if (console && console.group) console.group('📋 Stack Trace:');
                    if (console && console.log) console.log(value);
                    if (console && console.groupEnd) console.groupEnd();
                } else if ((key.toLowerCase().includes('reasons') || key.toLowerCase().includes('causes')) && Array.isArray(value)) {
                    if (console && console.group) console.group('💡 Possible Reasons:');
                    if (console && console.log) value.forEach((reason: string, index: number) => console.log(`  ${index + 1}. ${reason}`));
                    if (console && console.groupEnd) console.groupEnd();
                } else {
                    if (console && console.log) console.log(`%c${key}:%c ${this._formatValue(value)}`, keyStyle, valueStyle);
                }
            });
        } else {
            if (console && console.log) console.log(data);
        }

        if (console && console.groupEnd) {
            console.groupEnd();
        }
    }

    /**
     * Formats a value for display in the detailed log.
     * @param value The value to format.
     */
    private _formatValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'boolean' || typeof value === 'number') return value.toString();
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) return `[Array (${value.length} items)]`;
        if (typeof value === 'object') return `{Object (${Object.keys(value).length} properties)}`;
        return String(value);
    }
}

const logger = new Logger();
export default logger;
