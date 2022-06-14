import {App} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';
import {SelectModal} from './SelectModal';

export class MediaDbSearchResultModal extends SelectModal<MediaTypeModel> {
	plugin: MediaDbPlugin;
	heading: string;
	onSubmit: (error: Error, result: MediaTypeModel[]) => void;
	onCancel: () => void;
	onSkip: () => void;

	sendCallback: boolean;

	constructor(app: App, plugin: MediaDbPlugin, elements: MediaTypeModel[], skipButton: boolean, onSubmit: (error: Error, result: MediaTypeModel[]) => void, onCancel: () => void, onSkip?: () => void) {
		super(app, elements);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
		this.onCancel = onCancel;
		this.onSkip = onSkip;

		this.title = 'Search Results';
		this.description = 'Select one or multiple search results.';
		this.skipButton = skipButton;

		this.sendCallback = false;
	}

	// Renders each suggestion item.
	renderElement(item: MediaTypeModel, el: HTMLElement) {
		el.createEl('div', {text: this.plugin.mediaTypeManager.getFileName(item)});
		el.createEl('small', {text: `${item.englishTitle}\n`});
		el.createEl('small', {text: `${item.type.toUpperCase() + (item.subType ? ` (${item.subType})` : '')} from ${item.dataSource}`});
	}

	// Perform action on the selected suggestion.
	submit() {
		this.onSubmit(null, this.selectModalElements.filter(x => x.isActive()).map(x => x.value));
		this.sendCallback = true;
		this.close();
	}

	skip() {
		this.onSkip();
		this.sendCallback = true;
		this.close();
	}

	onClose() {
		if (!this.sendCallback) {
			this.onCancel();
		}
	}
}
