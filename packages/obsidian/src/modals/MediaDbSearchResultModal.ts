import type MediaDbPlugin from 'packages/obsidian/src/main';
import { SelectModal } from 'packages/obsidian/src/modals/SelectModal';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { SelectModalData, SelectModalOptions } from 'packages/obsidian/src/utils/ModalHelper';
import { SELECTMODALOPTIONSDEFAULT } from 'packages/obsidian/src/utils/ModalHelper';

export class MediaDbSearchResultModal extends SelectModal<MediaTypeModel> {
	plugin: MediaDbPlugin;

	busy: boolean;
	sendCallback: boolean;

	submitCallback?: (res: SelectModalData) => void;
	closeCallback?: (err?: Error) => void;
	skipCallback?: () => void;
	submitButtonText: string;

	constructor(plugin: MediaDbPlugin, selectModalOptions: SelectModalOptions) {
		selectModalOptions = Object.assign({}, SELECTMODALOPTIONSDEFAULT, selectModalOptions);
		super(plugin.app, selectModalOptions.elements ?? [], selectModalOptions.multiSelect);
		this.plugin = plugin;
		this.title = selectModalOptions.modalTitle ?? '';
		this.description = selectModalOptions.description ?? 'Select one or multiple search results.';
		this.addSkipButton = selectModalOptions.skipButton ?? false;
		this.submitButtonText = selectModalOptions.submitButtonText ?? 'Ok';
		this.busy = false;
		this.sendCallback = false;
	}

	setSubmitCb(submitCallback: (res: SelectModalData) => void): void {
		this.submitCallback = submitCallback;
	}

	setCloseCb(closeCallback: (err?: Error) => void): void {
		this.closeCallback = closeCallback;
	}

	setSkipCallback(skipCallback: () => void): void {
		this.skipCallback = skipCallback;
	}

	// Renders each suggestion item.
	renderElement(item: MediaTypeModel, el: HTMLElement): void {
		el.createDiv({ text: this.plugin.mediaTypeManager.getFileName(item) });
		el.createEl('small', { text: `${item.getSummary()}\n` });
		el.createEl('small', { text: `${item.type.toUpperCase() + (item.subType ? ` (${item.subType})` : '')} from ${item.dataSource}` });
	}

	// Perform action on the selected suggestion.
	submit(): void {
		if (!this.busy) {
			this.busy = true;
			this.submitButton?.setButtonText('Creating entry...');
			this.submitCallback?.({ selected: this.selectModalElements.filter(x => x.isActive()).map(x => x.value) });
		}
	}

	skip(): void {
		this.skipButton?.setButtonText('Skipping...');
		this.skipCallback?.();
	}

	onClose(): void {
		this.closeCallback?.();
	}
}
