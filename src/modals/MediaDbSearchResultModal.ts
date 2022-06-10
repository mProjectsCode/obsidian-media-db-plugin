import {App} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';
import {SelectModal} from './SelectModal';

export class MediaDbSearchResultModal extends SelectModal<MediaTypeModel> {
	plugin: MediaDbPlugin;
	heading: string;
	onChoose: (error: Error, result: MediaTypeModel[]) => void;

	constructor(app: App, plugin: MediaDbPlugin, elements: MediaTypeModel[], onChoose: (error: Error, result: MediaTypeModel[]) => void) {
		super(app, elements);
		this.plugin = plugin;
		this.onChoose = onChoose;

		this.title = 'Search Results';
		this.description = 'Select one or multiple search results.';
	}

	// Renders each suggestion item.
	renderElement(item: MediaTypeModel, el: HTMLElement) {
		el.createEl('div', {text: this.plugin.mediaTypeManager.getFileName(item)});
		el.createEl('small', {text: `${item.englishTitle}\n`});
		el.createEl('small', {text: `${item.type.toUpperCase() + (item.subType ? ` (${item.subType})` : '')} from ${item.dataSource}`});
	}

	// Perform action on the selected suggestion.
	submit() {
		this.onChoose(null, this.selectModalElements.filter(x => x.isActive()).map(x => x.value));
		this.close();
	}
}
