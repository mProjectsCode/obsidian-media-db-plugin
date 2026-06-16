export enum MDBErrorKind {
	Validation = 'Validation',
	Api = 'Api',
	Network = 'Network',
	Vault = 'Vault',
	Modal = 'Modal',
	Cancelled = 'Cancelled',
	Unexpected = 'Unexpected',
}

export interface MDBError {
	kind: MDBErrorKind;
	message: string;
	userMessage?: string;
	cause?: unknown;
	context?: Record<string, unknown>;
}

export function toMdbError(cause: unknown, fallback: Omit<MDBError, 'cause'>): MDBError {
	const message = cause instanceof Error ? cause.message : String(cause);
	return { ...fallback, message: fallback.message || message, cause };
}
