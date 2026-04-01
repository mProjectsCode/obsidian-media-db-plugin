import { TFolder, TFile, Notice } from 'obsidian';
import type MediaDbPlugin from 'src/main';
import { BulkUpdateConfirmModal } from 'src/modals/BulkUpdateConfirmModal';
import { CompletionModal } from 'src/modals/CompletionModal';

export class BulkUpdateHelper {
	readonly plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	async updateFolder(folder: TFolder): Promise<void> {
		const mediaFiles = folder.children.filter((child): child is TFile => {
			if (!(child instanceof TFile)) return false;
			const metadata = this.plugin.getMetadataFromFileCache(child);
			return Boolean(metadata && metadata.dataSource && metadata.id);
		});

		if (mediaFiles.length === 0) {
			new Notice('MDB | No Media DB files found in this folder.');
			return;
		}

		new BulkUpdateConfirmModal(this.plugin.app, async (silent: boolean) => {
			new Notice(`MDB | Bulk updating ${mediaFiles.length} files. Please wait...`);
			const startTime = Date.now();
			let successCount = 0;
			let failCount = 0;

			for (const file of mediaFiles) {
				try {
					await this.plugin.updateNote(file, true, false, silent);
					successCount++;
				} catch (e) {
					console.error(`MDB | Failed to bulk update ${file.path}: `, e);
					failCount++;
				}
				await new Promise(resolve => setTimeout(resolve, 800));
			}

			new CompletionModal(this.plugin.app, {
				title: 'Bulk Update Complete',
				icon: '🔄',
				total: mediaFiles.length,
				success: successCount,
				errors: failCount,
				elapsedMs: Date.now() - startTime,
				notes: failCount > 0 ? ['Some files could not be updated. Check the console for details.'] : [],
			}).open();
		}).open();
	}
}
