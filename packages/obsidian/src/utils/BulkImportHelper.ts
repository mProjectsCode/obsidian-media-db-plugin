import type { TFolder } from 'obsidian';
import { TFile } from 'obsidian';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { MediaDbBulkImportModal as MediaDbBulkImportModal } from 'packages/obsidian/src/modals/MediaDbBulkImportModal';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { OutcomeStatus } from 'packages/obsidian/src/utils/result';
import { dateTimeToString, markdownTable } from 'packages/obsidian/src/utils/Utils';

export enum BulkImportLookupMethod {
	ID = 'id',
	TITLE = 'title',
}

interface BulkImportError {
	filePath: string;
	error: string;
	canceled?: boolean;
}

export class BulkImportHelper {
	readonly plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	async import(folder: TFolder): Promise<void> {
		const erroredFiles: BulkImportError[] = [];
		let canceled: boolean = false;

		const { selectedAPI, lookupMethod, fieldName, appendContent } = await new Promise<{
			selectedAPI: string;
			lookupMethod: BulkImportLookupMethod;
			fieldName: string;
			appendContent: boolean;
		}>(resolve => {
			new MediaDbBulkImportModal(this.plugin, (selectedAPI: string, lookupMethod: BulkImportLookupMethod, fieldName: string, appendContent: boolean) => {
				resolve({ selectedAPI, lookupMethod, fieldName, appendContent });
			}).open();
		});

		for (const child of folder.children) {
			if (!(child instanceof TFile)) {
				continue;
			}

			const file: TFile = child;
			if (canceled) {
				erroredFiles.push({ filePath: file.path, error: 'user canceled' });
				continue;
			}

			const metadata = this.plugin.fileHelper.getMetadataFromFileCache(file);
			const lookupValue = metadata[fieldName];

			if (!lookupValue || typeof lookupValue !== 'string') {
				erroredFiles.push({ filePath: file.path, error: `metadata field '${fieldName}' not found, empty, or not a string` });
				continue;
			} else if (lookupMethod === BulkImportLookupMethod.ID) {
				const error = await this.importById(file, lookupValue, selectedAPI, appendContent);
				if (error) {
					erroredFiles.push(error);
				}
			} else if (lookupMethod === BulkImportLookupMethod.TITLE) {
				const error = await this.importByTitle(file, lookupValue, selectedAPI, appendContent);
				if (error) {
					if (error.canceled) {
						canceled = true;
					}
					erroredFiles.push(error);
				}
			} else {
				erroredFiles.push({ filePath: file.path, error: `invalid lookup type` });
				continue;
			}
		}

		if (erroredFiles.length > 0) {
			await this.createErroredFilesReport(erroredFiles);
		}
	}

	private async importById(file: TFile, lookupValue: string, selectedAPI: string, appendContent: boolean): Promise<BulkImportError | undefined> {
		const modelResult = await this.plugin.apiManager.queryDetailedInfoById(lookupValue, selectedAPI);
		if (!modelResult.ok) {
			return { filePath: file.path, error: modelResult.error.userMessage ?? modelResult.error.message };
		}

		if (modelResult.value) {
			await this.plugin.fileHelper.createMediaDbNotes([modelResult.value], appendContent ? file : undefined);
			return undefined;
		}

		return { filePath: file.path, error: `Failed to query API with id: ${lookupValue}` };
	}

	private async importByTitle(file: TFile, lookupValue: string, selectedAPI: string, appendContent: boolean): Promise<BulkImportError | undefined> {
		const resultsResult = await this.plugin.apiManager.query(lookupValue, [selectedAPI]);
		if (!resultsResult.ok) {
			return { filePath: file.path, error: resultsResult.error.userMessage ?? resultsResult.error.message };
		}

		const results: MediaTypeModel[] = resultsResult.value.items;
		if (!results || results.length === 0) {
			return { filePath: file.path, error: `no search results` };
		}

		const selectModalResult = await this.plugin.modalHelper.createSelectModalOutcome({
			elements: results,
			skipButton: true,
			modalTitle: `Results for '${lookupValue}'`,
		});

		if (selectModalResult.status === OutcomeStatus.Error) {
			return { filePath: file.path, error: selectModalResult.error.userMessage ?? selectModalResult.error.message };
		}

		if (selectModalResult.status === OutcomeStatus.Cancelled) {
			return { filePath: file.path, error: 'user canceled', canceled: true };
		}

		if (selectModalResult.status === OutcomeStatus.Skipped) {
			return { filePath: file.path, error: 'user skipped' };
		}

		if (selectModalResult.data.selected.length === 0) {
			return { filePath: file.path, error: `no search results selected` };
		}

		const detailedResults = await this.plugin.entryHelper.queryDetails(selectModalResult.data.selected);
		await this.plugin.fileHelper.createMediaDbNotes(detailedResults, appendContent ? file : undefined);
		return undefined;
	}

	private async createErroredFilesReport(erroredFiles: BulkImportError[]): Promise<void> {
		const title = `MDB - bulk import error report ${dateTimeToString(new Date())}`;
		const filePath = `${title}.md`;

		const table = [['file', 'error']].concat(erroredFiles.map(x => [x.filePath, x.error]));

		const fileContent = `# ${title}\n\n${markdownTable(table)}`;
		await this.plugin.app.vault.create(filePath, fileContent);
	}
}
