import type { TFolder} from 'obsidian';
import { TFile, Notice } from 'obsidian';
import type MediaDbPlugin from 'src/main';
import { BulkUpdateConfirmModal } from 'src/modals/BulkUpdateConfirmModal';
import { CompletionModal } from 'src/modals/CompletionModal';
import { dateTimeToString, markdownTable } from './Utils';

export class BulkUpdateHelper {
	readonly plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	async updateFolder(folder: TFolder): Promise<void> {
		const mediaFiles = folder.children.filter((child): child is TFile => {
			if (!(child instanceof TFile)) return false;
			const metadata = this.plugin.getMetadataFromFileCache(child);
			return Boolean(metadata?.dataSource && metadata.id);
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
			const erroredFiles: { filePath: string; error: string }[] = [];

			for (const file of mediaFiles) {
				try {
					await this.plugin.updateNote(file, true, false, silent);
					successCount++;
				} catch (e) {
					console.error(`MDB | Failed to bulk update ${file.path}: `, e);
					failCount++;
					erroredFiles.push({ filePath: file.path, error: `${e}` });
				}
				await new Promise(resolve => setTimeout(resolve, 800));
			}

			if (failCount > 0 && erroredFiles.length > 0) {
				const title = `MDB - bulk update error report ${dateTimeToString(new Date())}`;
				const filePath = `${title}.md`;
				const table = [['file', 'error']].concat(erroredFiles.map(x => [x.filePath, x.error]));
				const fileContent = markdownTable(table);
				await this.plugin.app.vault.create(filePath, fileContent);
			}

			new CompletionModal(this.plugin.app, {
				title: 'Bulk Update Complete',
				icon: 'refresh-cw',
				total: mediaFiles.length,
				success: successCount,
				errors: failCount,
				elapsedMs: Date.now() - startTime,
				notes: failCount > 0 ? ['Some files could not be updated. A detailed report file has been created in your vault folder.'] : [],
			}).open();
		}).open();
	}
}
