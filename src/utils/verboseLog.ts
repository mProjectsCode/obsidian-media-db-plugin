let verboseLoggingGetter: (() => boolean) | null = null;

/** Call from plugin after settings are loaded; getter should read current `verboseMode`. */
export function setVerboseLoggingSource(getter: () => boolean): void {
	verboseLoggingGetter = getter;
}

export function isVerboseLoggingEnabled(): boolean {
	if (!verboseLoggingGetter) {
		return true;
	}
	return verboseLoggingGetter();
}

export function verboseLog(...args: unknown[]): void {
	if (isVerboseLoggingEnabled()) {
		console.log(...args);
	}
}

export function verboseDebug(...args: unknown[]): void {
	if (isVerboseLoggingEnabled()) {
		console.debug(...args);
	}
}
