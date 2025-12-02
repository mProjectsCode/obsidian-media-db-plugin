import { AbstractInputSuggest, TFile } from 'obsidian';

export class FileSuggest extends AbstractInputSuggest<TFile> {
	protected getSuggestions(query: string): TFile[] | Promise<TFile[]> {
		const lowerCaseInputStr = query.toLowerCase();

		// we do two filters because otherwise TS type inference does convert the array to TFile[]
		return this.app.vault.getAllLoadedFiles()
			.filter(file => file instanceof TFile)
			.filter(file => file.path.toLowerCase().contains(lowerCaseInputStr));
	}

	renderSuggestion(value: TFile, el: HTMLElement): void {
		el.setText(value.path);
	}
}
