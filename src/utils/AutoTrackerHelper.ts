import type { TFile, TFolder } from 'obsidian';
import { Notice } from 'obsidian';
import type MediaDbPlugin from 'src/main';
import { CompletionModal } from 'src/modals/CompletionModal';
import { dateTimeToString, markdownTable } from './Utils';

export class AutoTrackerHelper {
	readonly plugin: MediaDbPlugin;
	public isScanning: boolean = false;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	async startBackgroundScan(silent: boolean = false, targetFolder?: TFolder): Promise<void> {
		if (this.isScanning) return;
		this.isScanning = true;
		this.plugin.refreshAutoTrackerRibbon();
		await this.runAutoUpdate(silent, targetFolder);
		this.isScanning = false;
		this.plugin.refreshAutoTrackerRibbon();
	}

	async runAutoUpdate(silent: boolean = false, targetFolder?: TFolder): Promise<void> {
		const allFiles = targetFolder ? this.plugin.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(targetFolder.path)) : this.plugin.app.vault.getMarkdownFiles();

		const filesToUpdate: TFile[] = [];

		for (const file of allFiles) {
			const metadata = this.plugin.getMetadataFromFileCache(file);
			if (metadata?.dataSource && metadata.id) {
				const airingKey = this.plugin.settings.autoTrackerAiringKey;
				const releasedKey = this.plugin.settings.autoTrackerReleasedKey;
				if (metadata[airingKey] === true || metadata[releasedKey] === false) {
					filesToUpdate.push(file);
				}
			}
		}

		if (filesToUpdate.length === 0) {
			if (!silent) {
				new Notice('MDB Tracker | No airing or unreleased media found to update.');
			}
			return;
		}

		const noticeMsg = `MDB Tracker | Found ${filesToUpdate.length} ongoing/unreleased notes. Updating in background...`;
		if (!silent) {
			new Notice(noticeMsg);
		}
		console.log(noticeMsg);

		const startTime = Date.now();
		let successCount = 0;
		let failCount = 0;
		const erroredFiles: { filePath: string; error: string }[] = [];

		for (const file of filesToUpdate) {
			try {
				await this.plugin.updateNote(file, true, false, false, silent);
				successCount++;
			} catch (e) {
				console.warn(`MDB Tracker | Failed to auto-update ${file.path}: `, e);
				failCount++;
				erroredFiles.push({ filePath: file.path, error: `${e}` });
			}
			// Sleep longer (1s) to be completely safe during background checks
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		if (failCount > 0 && erroredFiles.length > 0) {
			const title = `MDB - auto tracker error report ${dateTimeToString(new Date())}`;
			const filePath = `${title}.md`;
			const table = [['file', 'error']].concat(erroredFiles.map(x => [x.filePath, x.error]));
			const fileContent = markdownTable(table);
			await this.plugin.app.vault.create(filePath, fileContent);
		}

		new CompletionModal(this.plugin.app, {
			title: 'Auto Tracker Complete',
			icon: 'target',
			total: filesToUpdate.length,
			success: successCount,
			errors: failCount,
			elapsedMs: Date.now() - startTime,
			notes: failCount > 0 ? ['Some notes could not be updated. A detailed report file has been created in your vault folder.'] : [],
		}).open();
	}
}
