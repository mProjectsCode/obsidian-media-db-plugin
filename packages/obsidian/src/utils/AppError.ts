export enum AppErrorKind {
	Validation = 'Validation',
	Api = 'Api',
	Network = 'Network',
	Vault = 'Vault',
	Modal = 'Modal',
	Cancelled = 'Cancelled',
	Unexpected = 'Unexpected',
}

export interface AppError {
	kind: AppErrorKind;
	message: string;
	userMessage?: string;
	cause?: unknown;
	context?: Record<string, unknown>;
}

export const appError = (error: AppError): AppError => error;

export const toAppError = (cause: unknown, fallback: Omit<AppError, 'cause'>): AppError => {
	const message = cause instanceof Error ? cause.message : String(cause);
	return { ...fallback, message: fallback.message || message, cause };
};
