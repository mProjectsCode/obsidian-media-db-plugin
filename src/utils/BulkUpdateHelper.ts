import { TFolder, TFile, Notice } from 'obsidian';
import type MediaDbPlugin from 'src/main';
import { BulkUpdateConfirmModal } from 'src/modals/BulkUpdateConfirmModal';

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

			let successCount = 0;
			let failCount = 0;

			for (const file of mediaFiles) {
				try {
					await this.plugin.updateNote(file, true, false, silent); // true = only update metadata
					successCount++;
				} catch (e) {
					console.error(`MDB | Failed to bulk update ${file.path}: `, e);
					failCount++;
				}
				// Sleep briefly to avoid API rate limits and UI freezing
				await new Promise(resolve => setTimeout(resolve, 800));
			}

			new Notice(`MDB | Bulk update finished. Success: ${successCount}. Failed: ${failCount}`);
		}).open();
	}
}
