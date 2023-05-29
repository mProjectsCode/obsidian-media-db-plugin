import { MediaTypeModel } from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';
import { SelectModal } from './SelectModal';
import { SELECT_MODAL_OPTIONS_DEFAULT, SelectModalData, SelectModalOptions } from '../utils/ModalHelper';

export class MediaDbSearchResultModal extends SelectModal<MediaTypeModel> {
	plugin: MediaDbPlugin;

	busy: boolean;
	sendCallback: boolean;

	submitCallback: (res: SelectModalData) => void;
	closeCallback: (err?: Error) => void;
	skipCallback: () => void;

	constructor(plugin: MediaDbPlugin, selectModalOptions: SelectModalOptions) {
		selectModalOptions = Object.assign({}, SELECT_MODAL_OPTIONS_DEFAULT, selectModalOptions);
		super(plugin.app, selectModalOptions.elements, selectModalOptions.multiSelect);
		this.plugin = plugin;

		this.title = selectModalOptions.modalTitle;
		this.description = 'Select one or multiple search results.';
		this.addSkipButton = selectModalOptions.skipButton;

		this.busy = false;

		this.sendCallback = false;
	}

	setSubmitCallback(submitCallback: (res: SelectModalData) => void): void {
		this.submitCallback = submitCallback;
	}

	setCloseCallback(closeCallback: (err?: Error) => void): void {
		this.closeCallback = closeCallback;
	}

	setSkipCallback(skipCallback: () => void): void {
		this.skipCallback = skipCallback;
	}

	// Renders each suggestion item.
	renderElement(item: MediaTypeModel, el: HTMLElement): void {
		el.createEl('div', { text: this.plugin.mediaTypeManager.getFileName(item) });
		el.createEl('small', { text: `${item.getSummary()}\n` });
		el.createEl('small', { text: `${item.type.toUpperCase() + (item.subType ? ` (${item.subType})` : '')} from ${item.dataSource}` });
	}

	// Perform action on the selected suggestion.
	submit(): void {
		if (!this.busy) {
			this.busy = true;
			this.submitButton.setButtonText('Creating entry...');
			this.submitCallback({ selected: this.selectModalElements.filter(x => x.isActive()).map(x => x.value) });
		}
	}

	skip(): void {
		this.skipButton.setButtonText('Skipping...');
		this.skipCallback();
	}

	onClose(): void {
		this.closeCallback();
	}
}
