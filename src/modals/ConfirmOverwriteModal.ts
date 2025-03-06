import type { App } from 'obsidian';
import { Modal, Setting } from 'obsidian';

export class ConfirmOverwriteModal extends Modal {
	result: boolean = false;
	onSubmit: (result: boolean) => void;
	fileName: string;

	constructor(app: App, fileName: string, onSubmit: (result: boolean) => void) {
		super(app);
		this.fileName = fileName;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'File already exists' });
		contentEl.createEl('p', { text: `The file "${this.fileName}" already exists. Do you want to overwrite it?` });

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

		const bottomSettingRow = new Setting(contentEl);
		bottomSettingRow.addButton(btn => {
			btn.setButtonText('Cancel');
			btn.onClick(() => this.close());
			btn.buttonEl.addClass('media-db-plugin-button');
		});
		bottomSettingRow.addButton(btn => {
			btn.setButtonText('Ok');
			btn.setCta();
			btn.onClick(() => {
				this.result = true;
				this.close();
			});
			btn.buttonEl.addClass('media-db-plugin-button');
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.onSubmit(this.result);
	}
}
