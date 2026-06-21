import type { App } from 'obsidian';
import { Modal, Setting, Notice } from 'obsidian';

export interface LegacyApiKeyEntry {
	key: string;
	value: string;
}

export class LegacyApiKeysModal extends Modal {
	private entries: LegacyApiKeyEntry[];
	private onConfirm: () => void;

	constructor(app: App, entries: LegacyApiKeyEntry[], onConfirm: () => void) {
		super(app);
		this.entries = entries;
		this.onConfirm = onConfirm;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass('media-db-plugin-legacy-keys-modal');

		contentEl.createEl('h2', { text: 'Media DB plugin: Legacy API keys found' });

		const wrapper = contentEl.createDiv({ cls: 'media-db-plugin-legacy-keys-wrapper' });

		const intro = wrapper.createDiv({ cls: 'media-db-plugin-legacy-keys-intro' });
		intro.createEl('p', {
			text: 'Media DB plugin has found old plaintext API keys in your settings. Copy them now if needed, they should be removed for safety.',
		});

		intro.createEl('p', {
			text: 'You will need to re-add your API keys using Obsidians encrypted Keychain storage in the plugins settings.',
		});

		const pre = wrapper.createEl('pre', { cls: 'media-db-plugin-legacy-keys-pre' });
		const code = pre.createEl('code');

		code.innerText = this.entries.map(e => `${e.key}: ${e.value}`).join('\n');
		pre.addClass('media-db-plugin-hidden');

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

		const bottomSettingRow = new Setting(contentEl);

		bottomSettingRow.addButton(btn => {
			btn.setButtonText('Copy');
			btn.onClick(async () => {
				await navigator.clipboard.writeText(code.innerText);
				new Notice('Legacy API keys copied to clipboard.');
			});
			btn.buttonEl.addClass('media-db-plugin-button');
		});

		bottomSettingRow.addButton(btn => {
			btn.setButtonText('Show keys');

			btn.onClick(() => {
				const isHidden = pre.hasClass('media-db-plugin-hidden');
				if (isHidden) {
					pre.removeClass('media-db-plugin-hidden');
					btn.setButtonText('Hide keys');
				} else {
					pre.addClass('media-db-plugin-hidden');
					btn.setButtonText('Show keys');
				}
			});

			btn.buttonEl.addClass('media-db-plugin-button');
		});

		bottomSettingRow.addButton(btn => {
			btn.setButtonText('Delete plaintext keys');
			btn.setWarning();
			btn.onClick(() => {
				this.close();
				this.onConfirm();
			});
			btn.buttonEl.addClass('media-db-plugin-button');
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
