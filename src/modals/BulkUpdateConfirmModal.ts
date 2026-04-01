import { App, Modal, Setting } from 'obsidian';

export class BulkUpdateConfirmModal extends Modal {
	onSubmit: (silent: boolean) => void;
	silentUpdate: boolean = true;

	constructor(app: App, onSubmit: (silent: boolean) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Bulk Update Metadata' });
		contentEl.createEl('p', { text: 'You are about to scan and update metadata for notes in this folder.' });

		new Setting(contentEl)
			.setName('Update Silently (No Confirmations)')
			.setDesc('If enabled, all updates will aggressively overwrite the note frontmatter without asking for individual confirmation for each file.')
			.addToggle(toggle => toggle
				.setValue(this.silentUpdate)
				.onChange(value => (this.silentUpdate = value))
			);

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Start Update')
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.silentUpdate);
				}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
