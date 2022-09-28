import {MediaTypeModel} from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';
import {SelectModal} from './SelectModal';

export class MediaDbSearchResultModal extends SelectModal<MediaTypeModel> {
	plugin: MediaDbPlugin;
	heading: string;
	busy: boolean;
	submitCallback: (res: MediaTypeModel[]) => void;
	closeCallback: (err?: Error) => void;
	skipCallback: () => void;

	sendCallback: boolean;

	constructor(plugin: MediaDbPlugin, elements: MediaTypeModel[], skipButton: boolean, allowMultiSelect: boolean = true) {
		super(plugin.app, elements, allowMultiSelect);
		this.plugin = plugin;

		this.title = 'Search Results';
		this.description = 'Select one or multiple search results.';
		this.addSkipButton = skipButton;

		this.busy = false;

		this.sendCallback = false;
	}

	setSubmitCallback(submitCallback: (res: MediaTypeModel[]) => void): void {
		this.submitCallback = submitCallback;
	}

	setCloseCallback(closeCallback: (err?: Error) => void): void {
		this.closeCallback = closeCallback;
	}

	setSkipCallback(skipCallback: () => void): void {
		this.skipCallback = skipCallback;
	}

	// Renders each suggestion item.
	renderElement(item: MediaTypeModel, el: HTMLElement) {
		el.createEl('div', {text: this.plugin.mediaTypeManager.getFileName(item)});
		el.createEl('small', {text: `${item.getSummary()}\n`});
		el.createEl('small', {text: `${item.type.toUpperCase() + (item.subType ? ` (${item.subType})` : '')} from ${item.dataSource}`});
	}

	// Perform action on the selected suggestion.
	submit() {
		if (!this.busy) {
			this.busy = true;
			this.submitButton.setButtonText('Creating entry...');
			this.submitCallback(this.selectModalElements.filter(x => x.isActive()).map(x => x.value));
		}
	}

	skip() {
		this.skipButton.setButtonText('Skipping...');
		this.skipCallback();
	}

	onClose() {
		this.closeCallback();
	}
}
