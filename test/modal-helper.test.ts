import { expect, mock, test } from 'bun:test';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { ModalLifecycle, ModalSession } from 'packages/obsidian/src/utils/ModalHelper';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind } from 'packages/obsidian/src/utils/MDBError';
import { OutcomeStatus } from 'packages/obsidian/src/utils/result';

mock.module('obsidian', () => ({
	AbstractInputSuggest: class {},
	Component: class {
		load(): void {}
		unload(): void {}
	},
	DropdownComponent: class {},
	MarkdownRenderer: { render: async (): Promise<void> => {} },
	MarkdownView: class {},
	Modal: class {
		app: unknown;

		constructor(app: unknown) {
			this.app = app;
		}

		open(): void {}
		close(): void {}
	},
	Notice: class {},
	normalizePath: (path: string): string => path,
	moment: Object.assign((value?: unknown): unknown => value, { locale: (): void => {} }),
	parseYaml: (): unknown => ({}),
	Plugin: class {},
	PluginSettingTab: class {},
	requestUrl: async (): Promise<unknown> => ({}),
	SecretComponent: class {},
	Setting: class {},
	SettingGroup: class {},
	stringifyYaml: (value: unknown): string => String(value),
	TFile: class {},
	TFolder: class {},
	TextComponent: class {},
	ToggleComponent: class {},
}));

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

async function createHelper(): Promise<import('packages/obsidian/src/utils/ModalHelper').ModalHelper> {
	const { ModalHelper } = await import('packages/obsidian/src/utils/ModalHelper');
	return new ModalHelper({} as MediaDbPlugin);
}

test('runModalTask closes the modal after active task success', async () => {
	const helper = await createHelper();
	const session = createModalSession(() => false);

	const outcome = await helper.runModalTask(session, async () => 'done');

	expect(outcome).toEqual({ status: OutcomeStatus.Ok, data: 'done' });
	expect(session.modal.closeCount).toBe(1);
});

test('runModalTask ignores late success after cancellation', async () => {
	const helper = await createHelper();
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
	const helper = await createHelper();
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
