import {App, SuggestModal} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';
import MediaDbPlugin from '../main';

export class MediaDbSearchResultModal extends SuggestModal<MediaTypeModel> {
	suggestion: MediaTypeModel[];
	plugin: MediaDbPlugin;
	onChoose: (error: Error, result?: MediaTypeModel) => void;

	constructor(app: App, plugin: MediaDbPlugin, suggestion: MediaTypeModel[], onChoose: (error: Error, result?: MediaTypeModel) => void) {
		super(app);
		this.plugin = plugin;
		this.suggestion = suggestion;
		this.onChoose = onChoose;
	}

	getSuggestions(query: string): MediaTypeModel[] {
		return this.suggestion.filter(item => {
			const searchQuery = query.toLowerCase();
			return item.title.toLowerCase().includes(searchQuery);
		});
	}

	// Renders each suggestion item.
	renderSuggestion(item: MediaTypeModel, el: HTMLElement) {
		el.createEl('div', {text: this.plugin.mediaTypeManager.getFileName(item)});
		el.createEl('small', {text: `${item.englishTitle}\n`});
		el.createEl('small', {text: `${item.type.toUpperCase() + (item.subType ? ` (${item.subType})` : '')} from ${item.dataSource}`});
	}

	// Perform action on the selected suggestion.
	onChooseSuggestion(item: MediaTypeModel, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(null, item);
	}
}
