import type { TAbstractFile } from 'obsidian';
import { AbstractInputSuggest, TFile } from 'obsidian';

export class FileSuggest extends AbstractInputSuggest<TFile> {
	protected getSuggestions(query: string): TFile[] | Promise<TFile[]> {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const files: TFile[] = [];
		const lowerCaseInputStr = query.toLowerCase();

		abstractFiles.forEach((file: TAbstractFile) => {
			if (file instanceof TFile && file.name.toLowerCase().contains(lowerCaseInputStr)) {
				files.push(file);
			}
		});

		return files;
	}

	renderSuggestion(value: TFile, el: HTMLElement): void {
		el.setText(value.path);
	}
}
