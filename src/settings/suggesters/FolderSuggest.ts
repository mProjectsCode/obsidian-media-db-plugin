import { AbstractInputSuggest, TFolder } from 'obsidian';

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	protected getSuggestions(query: string): TFolder[] | Promise<TFolder[]> {
		const lowerCaseInputStr = query.toLowerCase();

		// we do two filters because otherwise TS type inference does convert the array to TFolder[]
		return this.app.vault.getAllLoadedFiles()
			.filter(file => file instanceof TFolder)
			.filter(file => file.path.toLowerCase().contains(lowerCaseInputStr));
	}

	renderSuggestion(value: TFolder, el: HTMLElement): void {
		el.setText(value.path);
	}
}
