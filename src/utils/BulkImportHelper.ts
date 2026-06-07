import type { TFolder } from 'obsidian';
import { TFile } from 'obsidian';
import type MediaDbPlugin from 'src/main';
import { MediaDbBulkImportModal as MediaDbBulkImportModal } from 'src/modals/MediaDbBulkImportModal';
import type { MediaTypeModel } from 'src/models/MediaTypeModel';
import { ModalResultCode } from './ModalHelper';
import { dateTimeToString, markdownTable } from './Utils';

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

			const metadata = this.plugin.getMetadataFromFileCache(file);
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
		try {
			const model = await this.plugin.apiManager.queryDetailedInfoById(lookupValue, selectedAPI);
			if (model) {
				await this.plugin.createMediaDbNotes([model], appendContent ? file : undefined);
				return undefined;
			} else {
				return { filePath: file.path, error: `Failed to query API with id: ${lookupValue}` };
			}
		} catch (e) {
			return { filePath: file.path, error: `${e}` };
		}
	}

	private async importByTitle(file: TFile, lookupValue: string, selectedAPI: string, appendContent: boolean): Promise<BulkImportError | undefined> {
		let results: MediaTypeModel[] = [];
		try {
			results = await this.plugin.apiManager.query(lookupValue, [selectedAPI]);
		} catch (e) {
			return { filePath: file.path, error: `${e}` };
		}
		if (!results || results.length === 0) {
			return { filePath: file.path, error: `no search results` };
		}

		const { selectModalResult, selectModal } = await this.plugin.modalHelper.createSelectModal({
			elements: results,
			skipButton: true,
			modalTitle: `Results for '${lookupValue}'`,
		});

		if (selectModalResult.code === ModalResultCode.ERROR) {
			selectModal.close();
			return { filePath: file.path, error: selectModalResult.error.message };
		}

		if (selectModalResult.code === ModalResultCode.CLOSE) {
			selectModal.close();
			return { filePath: file.path, error: 'user canceled', canceled: true };
		}

		if (selectModalResult.code === ModalResultCode.SKIP) {
			selectModal.close();
			return { filePath: file.path, error: 'user skipped' };
		}

		if (selectModalResult.data.selected.length === 0) {
			selectModal.close();
			return { filePath: file.path, error: `no search results selected` };
		}

		const detailedResults = await this.plugin.queryDetails(selectModalResult.data.selected);
		await this.plugin.createMediaDbNotes(detailedResults, appendContent ? file : undefined);

		selectModal.close();
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
