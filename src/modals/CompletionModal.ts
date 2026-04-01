import { type App, Modal, ButtonComponent } from 'obsidian';

export interface CompletionResult {
	/** Title shown in the modal header */
	title: string;
	/** Icon emoji for the operation type */
	icon?: string;
	/** Total number of items processed */
	total: number;
	/** Number of successfully processed items */
	success: number;
	/** Number of failed items */
	errors: number;
	/** Number of skipped items (optional) */
	skipped?: number;
	/** Elapsed time in milliseconds */
	elapsedMs?: number;
	/** Optional extra lines shown below the stats */
	notes?: string[];
}

export class CompletionModal extends Modal {
	private result: CompletionResult;

	constructor(app: App, result: CompletionResult) {
		super(app);
		this.result = result;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('mdb-completion-modal');

		const r = this.result;
		const icon = r.icon ?? '✅';
		const allSuccess = r.errors === 0;

		// Header
		const header = contentEl.createEl('div', { cls: 'mdb-completion-header' });
		header.createEl('span', { cls: 'mdb-completion-icon', text: allSuccess ? icon : '⚠️' });
		header.createEl('h2', { cls: 'mdb-completion-title', text: r.title });

		// Stats
		const stats = contentEl.createEl('div', { cls: 'mdb-completion-stats' });

		this.addStatRow(stats, '📄 Total', `${r.total}`);
		this.addStatRow(stats, '✅ Successful', `${r.success}`, 'success');
		this.addStatRow(stats, '❌ Errors', `${r.errors}`, r.errors > 0 ? 'error' : undefined);

		if (r.skipped !== undefined) {
			this.addStatRow(stats, '⏭️ Skipped', `${r.skipped}`, 'skipped');
		}

		if (r.elapsedMs !== undefined) {
			const secs = (r.elapsedMs / 1000).toFixed(1);
			this.addStatRow(stats, '⏱️ Duration', `${secs}s`);
		}

		// Notes
		if (r.notes && r.notes.length > 0) {
			const notesEl = contentEl.createEl('div', { cls: 'mdb-completion-notes' });
			for (const note of r.notes) {
				notesEl.createEl('p', { text: note });
			}
		}

		// Close button
		const footer = contentEl.createEl('div', { cls: 'mdb-completion-footer' });
		new ButtonComponent(footer)
			.setButtonText('Close')
			.setCta()
			.onClick(() => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private addStatRow(container: HTMLElement, label: string, value: string, cls?: string): void {
		const row = container.createEl('div', { cls: 'mdb-completion-row' });
		row.createEl('span', { cls: 'mdb-completion-label', text: label });
		row.createEl('span', { cls: `mdb-completion-value${cls ? ' mdb-stat-' + cls : ''}`, text: value });
	}
}
