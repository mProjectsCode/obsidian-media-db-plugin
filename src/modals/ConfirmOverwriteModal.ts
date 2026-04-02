import type { App } from 'obsidian';
import { Modal, Setting } from 'obsidian';

export enum ConfirmOverwriteChoice {
	Overwrite = 'overwrite',
	Skip = 'skip',
	Abort = 'abort',
	KeepExisting = 'keepExisting',
}

export class ConfirmOverwriteModal extends Modal {
	choice: ConfirmOverwriteChoice = ConfirmOverwriteChoice.Skip;
	onSubmit: (choice: ConfirmOverwriteChoice) => void;
	fileName: string;
	private readonly showAbortRemaining: boolean;
	private readonly showSkip: boolean;
	/**
	 * When set: body text plus Abort (red) / optional Skip / No / Yes.
	 * When unset and showAbortRemaining: legacy Skip / warning Abort / Yes.
	 */
	private readonly detail: string | undefined;

	constructor(
		app: App,
		fileName: string,
		onSubmit: (choice: ConfirmOverwriteChoice) => void,
		opts?: {
			showAbortRemaining?: boolean;
			showSkip?: boolean;
			/** Explains overwrite vs keep vs abort for chained imports (artist discography, album + tracks). */
			detail?: string;
		},
	) {
		super(app);
		this.fileName = fileName;
		this.onSubmit = onSubmit;
		this.showAbortRemaining = opts?.showAbortRemaining ?? false;
		this.showSkip = opts?.showSkip ?? false;
		this.detail = opts?.detail;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'File already exists' });

		const defaultParagraph = `The file "${this.fileName}" already exists. Do you want to overwrite it?`;
		contentEl.createEl('p', { text: this.detail ?? defaultParagraph });

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

		const bottomSettingRow = new Setting(contentEl);
		if (this.detail !== undefined) {
			if (this.showAbortRemaining) {
				bottomSettingRow.addButton(btn => {
					btn.setButtonText('Abort');
					btn.onClick(() => {
						this.choice = ConfirmOverwriteChoice.Abort;
						this.close();
					});
					btn.buttonEl.addClass('media-db-plugin-button');
					btn.buttonEl.addClass('media-db-plugin-abort-button');
				});
			}
			if (this.showSkip) {
				bottomSettingRow.addButton(btn => {
					btn.setButtonText('Skip');
					btn.onClick(() => {
						this.choice = ConfirmOverwriteChoice.Skip;
						this.close();
					});
					btn.buttonEl.addClass('media-db-plugin-button');
				});
			}
			bottomSettingRow.addButton(btn => {
				btn.setButtonText('No');
				btn.onClick(() => {
					this.choice = ConfirmOverwriteChoice.KeepExisting;
					this.close();
				});
				btn.buttonEl.addClass('media-db-plugin-button');
			});
			bottomSettingRow.addButton(btn => {
				btn.setButtonText('Yes');
				btn.setCta();
				btn.onClick(() => {
					this.choice = ConfirmOverwriteChoice.Overwrite;
					this.close();
				});
				btn.buttonEl.addClass('media-db-plugin-button');
			});
		} else {
			if (this.showAbortRemaining) {
				bottomSettingRow.addButton(btn => {
					btn.setButtonText('Abort');
					btn.setWarning();
					btn.onClick(() => {
						this.choice = ConfirmOverwriteChoice.Abort;
						this.close();
					});
					btn.buttonEl.addClass('media-db-plugin-button');
				});
			}
			bottomSettingRow.addButton(btn => {
				btn.setButtonText(this.showAbortRemaining ? 'Skip' : 'No');
				btn.onClick(() => this.close());
				btn.buttonEl.addClass('media-db-plugin-button');
			});
			bottomSettingRow.addButton(btn => {
				btn.setButtonText('Yes');
				btn.setCta();
				btn.onClick(() => {
					this.choice = ConfirmOverwriteChoice.Overwrite;
					this.close();
				});
				btn.buttonEl.addClass('media-db-plugin-button');
			});
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.onSubmit(this.choice);
	}
}
