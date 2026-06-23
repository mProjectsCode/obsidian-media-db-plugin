import { expect, test } from 'bun:test';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { ModalHelper, type ModalLifecycle, type ModalSession } from 'packages/obsidian/src/utils/ModalHelper';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind } from 'packages/obsidian/src/utils/MDBError';
import { OutcomeStatus } from 'packages/obsidian/src/utils/result';

class FakeModal implements ModalLifecycle {
	closeCount = 0;

	open(): void {
		// Test modal does not need to render.
	}

	close(): void {
		this.closeCount += 1;
	}
}

function createModalSession(cancelled: () => boolean): ModalSession<undefined, FakeModal> {
	const modal = new FakeModal();

	return {
		modal,
		modalResult: { status: OutcomeStatus.Ok, data: undefined },
		close: (): void => modal.close(),
		isCancelled: cancelled,
	};
}

function createHelper(): ModalHelper {
	return new ModalHelper({} as MediaDbPlugin);
}

test('runModalTask closes the modal after active task success', async () => {
	const helper = createHelper();
	const session = createModalSession(() => false);

	const outcome = await helper.runModalTask(session, async () => 'done');

	expect(outcome).toEqual({ status: OutcomeStatus.Ok, data: 'done' });
	expect(session.modal.closeCount).toBe(1);
});

test('runModalTask ignores late success after cancellation', async () => {
	const helper = createHelper();
	let cancelled = false;
	const session = createModalSession(() => cancelled);

	const outcome = await helper.runModalTask(session, async () => {
		cancelled = true;
		return 'late result';
	});

	expect(outcome).toEqual({ status: OutcomeStatus.Cancelled });
	expect(session.modal.closeCount).toBe(0);
});

test('runModalTask ignores late errors after cancellation', async () => {
	const helper = createHelper();
	let cancelled = false;
	const session = createModalSession(() => cancelled);
	const fallback: MDBError = { kind: MDBErrorKind.Modal, message: 'Task failed' };

	const outcome = await helper.runModalTask(
		session,
		async () => {
			cancelled = true;
			throw new Error('Late failure');
		},
		fallback,
	);

	expect(outcome).toEqual({ status: OutcomeStatus.Cancelled });
	expect(session.modal.closeCount).toBe(0);
});
