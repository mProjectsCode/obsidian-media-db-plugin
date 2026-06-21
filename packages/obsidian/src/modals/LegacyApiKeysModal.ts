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
            text: 'Media DB plugin has found old plaintext API keys in your settings. Copy them now if needed, they should be removed for safety. The new keychain-backed system will be used instead. The plugin will not be usable until the old plaintext keys have been deleted.',
        });

        const textarea = wrapper.createEl('textarea', {
            cls: 'media-db-plugin-legacy-keys-textarea',
            attr: {
                readonly: 'true',
                spellcheck: 'false',
            },
        });

        textarea.value = this.entries.map(e => `${e.key}: ${e.value}`).join('\n');
        textarea.style.display = 'none';

        contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

        const bottomSettingRow = new Setting(contentEl);

        bottomSettingRow.addButton(btn => {
            btn.setButtonText('Copy');
            btn.onClick(async () => {
                await navigator.clipboard.writeText(textarea.value);
                new Notice('Legacy API keys copied to clipboard.');
            });
            btn.buttonEl.addClass('media-db-plugin-button');
        });

        bottomSettingRow.addButton(btn => {
            btn.setButtonText('Show keys');

            btn.onClick(() => {
                const isHidden = textarea.style.display === 'none';

                if (isHidden) {
                    textarea.style.display = '';
                    btn.setButtonText('Hide keys');
                } else {
                    textarea.style.display = 'none';
                    btn.setButtonText('Show keys');
                }
            });

            btn.buttonEl.addClass('media-db-plugin-button');
        });

        bottomSettingRow.addButton(btn => {
            btn.setButtonText('Delete plaintext keys');
            btn.setCta();
            btn.onClick(() => {
                this.close();
                this.onConfirm();
            });
            btn.buttonEl.addClass('media-db-plugin-button');
			btn.buttonEl.addClass('mod-warning');
			btn.buttonEl.addClass('mod-danger');

        });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
