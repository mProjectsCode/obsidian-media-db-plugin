import {App, SuggestModal} from 'obsidian';
import {MediaTypeModel} from '../models/MediaTypeModel';

export class MediaDbSearchResultModal extends SuggestModal<MediaTypeModel> {
	suggestion: MediaTypeModel[];
	onChoose: (error: Error, result?: MediaTypeModel) => void;

	constructor(app: App, suggestion: MediaTypeModel[], onChoose: (error: Error, result?: MediaTypeModel) => void) {
		super(app);
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
		el.createEl('div', {text: item.premiere ? `${item.title} (${item.premiere})` : `${item.title}`});
		el.createEl('small', {text: `${item.type} from ${item.dataSource}`});
	}

	// Perform action on the selected suggestion.
	onChooseSuggestion(item: MediaTypeModel, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(null, item);
	}
}
