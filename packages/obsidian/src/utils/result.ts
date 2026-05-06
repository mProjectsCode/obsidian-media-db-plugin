export interface Ok<T> {
	ok: true;
	value: T;
}
export interface Err<E> {
	ok: false;
	error: E;
}
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
	return { ok: true, value };
}
export function err<E>(error: E): Err<E> {
	return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
	return result.ok;
}
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
	return !result.ok;
}

export function mapResult<T, E, U>(result: Result<T, E>, mapper: (value: T) => U): Result<U, E> {
	return result.ok ? ok(mapper(result.value)) : result;
}

export function mapError<T, E, F>(result: Result<T, E>, mapper: (error: E) => F): Result<T, F> {
	return result.ok ? result : err(mapper(result.error));
}

export function andThen<T, E, U>(result: Result<T, E>, binder: (value: T) => Result<U, E>): Result<U, E> {
	return result.ok ? binder(result.value) : result;
}

export function tapError<T, E>(result: Result<T, E>, sideEffect: (error: E) => void): Result<T, E> {
	if (!result.ok) sideEffect(result.error);
	return result;
}

export async function fromPromise<T, E>(promise: Promise<T>, onError: (cause: unknown) => E): Promise<Result<T, E>> {
	try {
		return ok(await promise);
	} catch (cause) {
		return err(onError(cause));
	}
}

export enum OutcomeStatus {
	Ok = 'ok',
	Cancelled = 'cancelled',
	Skipped = 'skipped',
	Error = 'error',
}

export type Outcome<T, E> =
	| { status: OutcomeStatus.Ok; data: T }
	| { status: OutcomeStatus.Cancelled }
	| { status: OutcomeStatus.Skipped }
	| { status: OutcomeStatus.Error; error: E };

export function cancelled(): Outcome<never, never> {
	return { status: OutcomeStatus.Cancelled };
}
export function skipped(): Outcome<never, never> {
	return { status: OutcomeStatus.Skipped };
}
export function success<T>(data: T): Outcome<T, never> {
	return { status: OutcomeStatus.Ok, data };
}
export function failure<E>(error: E): Outcome<never, E> {
	return { status: OutcomeStatus.Error, error };
}
