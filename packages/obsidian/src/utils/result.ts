export interface Ok<T> {
	ok: true;
	value: T;
}
export interface Err<E> {
	ok: false;
	error: E;
}
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

export const mapResult = <T, E, U>(result: Result<T, E>, mapper: (value: T) => U): Result<U, E> => (result.ok ? ok(mapper(result.value)) : result);

export const mapError = <T, E, F>(result: Result<T, E>, mapper: (error: E) => F): Result<T, F> => (result.ok ? result : err(mapper(result.error)));

export const andThen = <T, E, U>(result: Result<T, E>, binder: (value: T) => Result<U, E>): Result<U, E> => (result.ok ? binder(result.value) : result);

export const tapError = <T, E>(result: Result<T, E>, sideEffect: (error: E) => void): Result<T, E> => {
	if (!result.ok) sideEffect(result.error);
	return result;
};

export const fromPromise = async <T, E>(promise: Promise<T>, onError: (cause: unknown) => E): Promise<Result<T, E>> => {
	try {
		return ok(await promise);
	} catch (cause) {
		return err(onError(cause));
	}
};

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

export const cancelled = (): Outcome<never, never> => ({ status: OutcomeStatus.Cancelled });
export const skipped = (): Outcome<never, never> => ({ status: OutcomeStatus.Skipped });
export const success = <T>(data: T): Outcome<T, never> => ({ status: OutcomeStatus.Ok, data });
export const failure = <E>(error: E): Outcome<never, E> => ({ status: OutcomeStatus.Error, error });
