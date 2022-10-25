import { TextInputSuggest } from './Suggest';
import { TAbstractFile, TFile } from 'obsidian';

export class FileSuggest extends TextInputSuggest<TFile> {
	getSuggestions(inputStr: string): TFile[] {
		const abstractFiles = this.app.vault.getAllLoadedFiles();
		const files: TFile[] = [];
		const lowerCaseInputStr = inputStr.toLowerCase();

		abstractFiles.forEach((file: TAbstractFile) => {
			if (file instanceof TFile && file.name.toLowerCase().contains(lowerCaseInputStr)) {
				files.push(file);
			}
		});

		return files;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.name);
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = file.name;
		this.inputEl.trigger('input');
		this.close();
	}
}
