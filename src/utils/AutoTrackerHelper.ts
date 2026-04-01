import { Notice, TFile, TFolder } from 'obsidian';
import type MediaDbPlugin from 'src/main';

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
			if (metadata && metadata.dataSource && metadata.id) {
				// We only care about notes that are specifically marked as airing (TV/Anime) 
				// or released: false (Games/Movies)
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

		let successCount = 0;
		for (const file of filesToUpdate) {
			try {
				await this.plugin.updateNote(file, true, false, silent);
				successCount++;
			} catch (e) {
				console.warn(`MDB Tracker | Failed to auto-update ${file.path}: `, e);
			}
			// Sleep longer (1s) to be completely safe during background checks
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		if (!silent) {
			new Notice(`MDB Tracker | Background update finished. ${successCount}/${filesToUpdate.length} updated successfully.`);
		}
	}
}
