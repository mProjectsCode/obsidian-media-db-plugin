declare const __LOG_LEVEL__: number;

enum LogLevel {
	NONE = 0,
	ERROR = 1,
	WARN = 2,
	LOG = 3,
	DEBUG = 4,
}

const logLevel: LogLevel = typeof __LOG_LEVEL__ !== 'undefined' ? __LOG_LEVEL__ : LogLevel.LOG;

export class Logger {
	static debug(...args: unknown[]): void {
		if (logLevel >= LogLevel.DEBUG) {
			console.debug(...args);
		}
	}

	static log(...args: unknown[]): void {
		if (logLevel >= LogLevel.LOG) {
			// eslint-disable-next-line obsidianmd/rule-custom-message -- These log statements are disabled for production builds.
			console.log(...args);
		}
	}

	static warn(...args: unknown[]): void {
		if (logLevel >= LogLevel.WARN) {
			console.warn(...args);
		}
	}

	static error(...args: unknown[]): void {
		if (logLevel >= LogLevel.ERROR) {
			console.error(...args);
		}
	}
}
