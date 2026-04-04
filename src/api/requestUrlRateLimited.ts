import type { RequestUrlParam, RequestUrlResponse } from 'obsidian';
import { requestUrl } from 'obsidian';

/** Retries after the first attempt (4 attempts total). */
const RATE_LIMIT_MAX_RETRIES = 3;

const BACKOFF_BASE_MS = 1000;
const RETRY_AFTER_CAP_MS = 15_000;

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function defaultIsRateLimitedStatus(status: number): boolean {
	return status === 429 || status === 503;
}

function parseRetryAfterMs(headers: Record<string, string>): number | undefined {
	for (const key of Object.keys(headers)) {
		if (key.toLowerCase() !== 'retry-after') {
			continue;
		}
		const raw = String(headers[key]).trim();
		const sec = parseInt(raw, 10);
		if (Number.isFinite(sec) && sec >= 0) {
			return Math.min(sec * 1000, RETRY_AFTER_CAP_MS);
		}
		return undefined;
	}
	return undefined;
}

export interface RequestUrlRateLimitedOptions {
	/** Shown in `console.warn` (e.g. `MusicBrainz`, `Spotify`). */
	logLabel: string;
	isRateLimited?: (status: number) => boolean;
}

/**
 * HTTP request with retries on 429 / 503: honors `Retry-After` (capped) or exponential backoff (1s, 2s, 4s).
 */
export async function requestUrlRateLimited(
	param: RequestUrlParam,
	options: RequestUrlRateLimitedOptions,
): Promise<RequestUrlResponse> {
	const isRL = options.isRateLimited ?? defaultIsRateLimitedStatus;
	let last: RequestUrlResponse | undefined;

	for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
		const res = await requestUrl({ ...param, throw: false });
		last = res;

		if (!isRL(res.status) || retry === RATE_LIMIT_MAX_RETRIES) {
			return res;
		}

		const fromHeader = parseRetryAfterMs(res.headers);
		const backoffMs = fromHeader ?? BACKOFF_BASE_MS * 2 ** retry;
		console.warn(
			`MDB | ${options.logLabel} rate limited (HTTP ${res.status}), retry ${retry + 1}/${RATE_LIMIT_MAX_RETRIES} after ${backoffMs}ms`,
		);
		await sleep(backoffMs);
	}

	return last!;
}
