import type { App } from 'obsidian';
import { Modal, Setting } from 'obsidian';

export type BulkRecreateMode = 'reorder' | 'full';

const MODE_DESCRIPTIONS: Record<BulkRecreateMode, string> = {
	reorder:
		'All existing note data and custom template values are preserved. Only the property order and Pin settings from your current Property Mapping configuration are re-applied.',
	full: '⚠️ Each note is completely rebuilt from scratch using your template. Any changes you made to the note after it was created (e.g. custom fields added by your template) will be reset to their template defaults.',
};

export class BulkRecreateConfirmModal extends Modal {
	onSubmit: (mode: BulkRecreateMode, silent: boolean) => void;
	mode: BulkRecreateMode = 'reorder';
	silentUpdate: boolean = false;

	private descEl!: HTMLParagraphElement;

	constructor(app: App, onSubmit: (mode: BulkRecreateMode, silent: boolean) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Bulk Recreate Notes' });
		contentEl.createEl('p', {
			text: 'You are about to process all Media DB notes in this folder. Choose how each note should be rebuilt:',
			cls: 'mod-muted',
		});

		this.descEl = contentEl.createEl('p', {
			text: MODE_DESCRIPTIONS[this.mode],
		});
		this.descEl.style.cssText = 'padding: 8px 12px; border-left: 3px solid var(--interactive-accent); margin-bottom: 12px; font-size: var(--font-ui-small);';

		new Setting(contentEl)
			.setName('Recreate Mode')
			.addDropdown(drop =>
				drop
					.addOption('reorder', 'Apply Property Order (Safe)')
					.addOption('full', 'Full Template Reset')
					.setValue(this.mode)
					.onChange(value => {
						this.mode = value as BulkRecreateMode;
						this.descEl.setText(MODE_DESCRIPTIONS[this.mode]);
						this.descEl.style.borderLeftColor = this.mode === 'full' ? 'var(--color-red)' : 'var(--interactive-accent)';
					}),
			);

		new Setting(contentEl)
			.setName('Update Silently (No Confirmations)')
			.setDesc('If enabled, all updates will run without asking for individual confirmation for each file.')
			.addToggle(toggle => toggle.setValue(this.silentUpdate).onChange(value => (this.silentUpdate = value)));

		new Setting(contentEl).addButton(btn =>
			btn
				.setButtonText('Start Recreate')
				.setWarning()
				.onClick(() => {
					this.close();
					this.onSubmit(this.mode, this.silentUpdate);
				}),
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
