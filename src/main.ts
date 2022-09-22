import {Notice, parseYaml, Plugin, stringifyYaml, TFile, TFolder} from 'obsidian';
import {DEFAULT_SETTINGS, MediaDbPluginSettings, MediaDbSettingTab} from './settings/Settings';
import {APIManager} from './api/APIManager';
import {MediaTypeModel} from './models/MediaTypeModel';
import {dateTimeToString, debugLog, markdownTable, replaceIllegalFileNameCharactersInString, UserCancelError, UserSkipError} from './utils/Utils';
import {OMDbAPI} from './api/apis/OMDbAPI';
import {MediaDbAdvancedSearchModal} from './modals/MediaDbAdvancedSearchModal';
import {MediaDbSearchResultModal} from './modals/MediaDbSearchResultModal';
import {MALAPI} from './api/apis/MALAPI';
import {MediaDbIdSearchModal} from './modals/MediaDbIdSearchModal';
import {WikipediaAPI} from './api/apis/WikipediaAPI';
import {MusicBrainzAPI} from './api/apis/MusicBrainzAPI';
import {MediaTypeManager} from './utils/MediaTypeManager';
import {SteamAPI} from './api/apis/SteamAPI';
import {BoardGameGeekAPI} from './api/apis/BoardGameGeekAPI';
import {ModelPropertyMapper} from './settings/ModelPropertyMapper';
import {YAMLConverter} from './utils/YAMLConverter';
import {MediaDbFolderImportModal} from './modals/MediaDbFolderImportModal';

export default class MediaDbPlugin extends Plugin {
	settings: MediaDbPluginSettings;
	apiManager: APIManager;
	mediaTypeManager: MediaTypeManager;
	modelPropertyMapper: ModelPropertyMapper;

	frontMatterRexExpPattern: string = '^(---)\\n[\\s\\S]*?\\n---';

	async onload() {
		await this.loadSettings();
		// register the settings tab
		this.addSettingTab(new MediaDbSettingTab(this.app, this));


		this.apiManager = new APIManager();
		// register APIs
		this.apiManager.registerAPI(new OMDbAPI(this));
		this.apiManager.registerAPI(new MALAPI(this));
		this.apiManager.registerAPI(new WikipediaAPI(this));
		this.apiManager.registerAPI(new MusicBrainzAPI(this));
		this.apiManager.registerAPI(new SteamAPI(this));
		this.apiManager.registerAPI(new BoardGameGeekAPI(this));
		// this.apiManager.registerAPI(new LocGovAPI(this)); // TODO: parse data

		this.mediaTypeManager = new MediaTypeManager(this.settings);
		this.modelPropertyMapper = new ModelPropertyMapper(this.settings);


		// add icon to the left ribbon
		const ribbonIconEl = this.addRibbonIcon('database', 'Add new Media DB entry', (evt: MouseEvent) =>
			this.createEntryWithAdvancedSearchModal(),
		);
		ribbonIconEl.addClass('obsidian-media-db-plugin-ribbon-class');

		this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
			if (file instanceof TFolder) {
				menu.addItem(item => {
					item.setTitle('Import folder as Media DB entries')
						.setIcon('database')
						.onClick(() => this.createEntriesFromFolder(file as TFolder));
				});
			}
		}));

		// register command to open search modal
		this.addCommand({
			id: 'open-media-db-search-modal',
			name: 'Add new Media DB entry',
			callback: () => this.createEntryWithAdvancedSearchModal(),
		});
		// register command to open id search modal
		this.addCommand({
			id: 'open-media-db-id-search-modal',
			name: 'Add new Media DB entry by id',
			callback: () => this.createEntryWithIdSearchModal(),
		});
		// register command to update the open note
		this.addCommand({
			id: 'update-media-db-note',
			name: 'Update the open note, if it is a Media DB entry.',
			checkCallback: (checking: boolean) => {
				if (!this.app.workspace.getActiveFile()) {
					return false;
				}
				if (!checking) {
					this.updateActiveNote();
				}
				return true;
			},
		});
	}

	async createEntryWithSearchModal() {

	}

	async createEntryWithAdvancedSearchModal() {
		let results: MediaTypeModel[] = [];
		try {
			const {query, apis} = await this.openMediaDbAdvancedSearchModal();

			new Notice('MediaDB Searching...');

			const apiSearchResults = await this.apiManager.query(query, apis);
			const selectResults = await this.openMediaDbSelectModal(apiSearchResults, false);
			results = await this.queryDetails(selectResults);
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
		}

		debugLog(results);
		await this.createMediaDbNotes(results);
	}

	async createEntryWithIdSearchModal() {
		let result: MediaTypeModel = undefined;
		try {
			const {query, api} = await this.openMediaDbIdSearchModal();

			new Notice('MediaDB Searching...');

			result = await this.apiManager.queryDetailedInfoById(query, api);
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
		}

		debugLog(result);
		await this.createMediaDbNoteFromModel(result);
	}

	async createMediaDbNotes(models: MediaTypeModel[], attachFile?: TFile): Promise<void> {
		for (const model of models) {
			await this.createMediaDbNoteFromModel(model, attachFile);
		}
	}

	async queryDetails(models: MediaTypeModel[]): Promise<MediaTypeModel[]> {
		let detailModels: MediaTypeModel[] = [];
		for (const model of models) {
			try {
				detailModels.push(await this.apiManager.queryDetailedInfo(model));
			} catch (e) {
				console.warn(e);
				new Notice(e.toString());
			}
		}
		return detailModels;
	}

	async createMediaDbNoteFromModel(mediaTypeModel: MediaTypeModel, attachFile?: TFile): Promise<void> {
		try {
			console.log('MDB | Creating new note...');
			// console.log(mediaTypeModel);

			let fileMetadata = this.modelPropertyMapper.convertObject(mediaTypeModel.toMetaDataObject());
			let fileContent = '';

			({fileMetadata, fileContent} = await this.attachFile(fileMetadata, fileContent, attachFile));
			({fileMetadata, fileContent} = await this.attachTemplate(fileMetadata, fileContent, await this.mediaTypeManager.getTemplate(mediaTypeModel, this.app)));

			fileContent = `---\n${this.settings.useCustomYamlStringifier ? YAMLConverter.toYaml(fileMetadata) : stringifyYaml(fileMetadata)}---\n` + fileContent;

			await this.createNote(this.mediaTypeManager.getFileName(mediaTypeModel), fileContent);
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
		}
	}

	async attachFile(fileMetadata: any, fileContent: string, fileToAttach?: TFile): Promise<{ fileMetadata: any, fileContent: string }> {
		if (!fileToAttach) {
			return {fileMetadata: fileMetadata, fileContent: fileContent};
		}

		let attachFileMetadata: any = this.app.metadataCache.getFileCache(fileToAttach).frontmatter;
		if (attachFileMetadata) {
			attachFileMetadata = JSON.parse(JSON.stringify(attachFileMetadata)); // deep copy
			delete attachFileMetadata.position;
		} else {
			attachFileMetadata = {};
		}
		fileMetadata = Object.assign(attachFileMetadata, fileMetadata);

		let attachFileContent: string = await this.app.vault.read(fileToAttach);
		const regExp = new RegExp('^(---)\\n[\\s\\S]*\\n---');
		attachFileContent = attachFileContent.replace(regExp, '');
		fileContent += '\n' + attachFileContent;

		return {fileMetadata: fileMetadata, fileContent: fileContent};
	}

	async attachTemplate(fileMetadata: any, fileContent: string, template: string): Promise<{ fileMetadata: any, fileContent: string }> {
		if (!template) {
			return {fileMetadata: fileMetadata, fileContent: fileContent};
		}

		let templateMetadata: any = this.getMetaDataFromFileContent(template);
		fileMetadata = Object.assign(templateMetadata, fileMetadata);

		const regExp = new RegExp('^(---)\\n[\\s\\S]*\\n---');
		const attachFileContent = template.replace(regExp, '');
		fileContent += '\n' + attachFileContent;

		return {fileMetadata: fileMetadata, fileContent: fileContent};
	}

	getMetaDataFromFileContent(fileContent: string): any {
		let metadata: any;

		const regExp = new RegExp('^(---)\\n[\\s\\S]*\\n---');
		const frontMatterRegExpResult = regExp.exec(fileContent);
		if (!frontMatterRegExpResult) {
			return {};
		}
		let frontMatter = frontMatterRegExpResult[0];
		if (!frontMatter) {
			return {};
		}
		frontMatter = frontMatter.substring(4);
		frontMatter = frontMatter.substring(0, frontMatter.length - 3);

		metadata = parseYaml(frontMatter);

		if (!metadata) {
			metadata = {};
		}

		return metadata;
	}

	/**
	 * Creates a note in the vault.
	 *
	 * @param fileName
	 * @param fileContent
	 * @param openFile
	 */
	async createNote(fileName: string, fileContent: string, openFile: boolean = false) {
		fileName = replaceIllegalFileNameCharactersInString(fileName);
		const filePath = `${this.settings.folder.replace(/\/$/, '')}/${fileName}.md`;

		// find and possibly create the folder set in settings
		const folder = this.app.vault.getAbstractFileByPath(this.settings.folder);
		if (!folder) {
			await this.app.vault.createFolder(this.settings.folder.replace(/\/$/, ''));
		}

		// find and delete file with the same name
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file) {
			await this.app.vault.delete(file);
		}

		// create the file
		const targetFile = await this.app.vault.create(filePath, fileContent);

		// open newly crated file
		if (openFile) {
			const activeLeaf = this.app.workspace.getUnpinnedLeaf();
			if (!activeLeaf) {
				console.warn('MDB | no active leaf, not opening media db note');
				return;
			}
			await activeLeaf.openFile(targetFile, {state: {mode: 'source'}});
		}
	}

	/**
	 * Update the active note by querying the API again.
	 * Tries to read the type, id and dataSource of the active note. If successful it will query the api, delete the old note and create a new one.
	 */
	async updateActiveNote() {
		const activeFile: TFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			throw new Error('MDB | there is no active note');
		}

		let metadata: any = this.app.metadataCache.getFileCache(activeFile).frontmatter;
		metadata = JSON.parse(JSON.stringify(metadata)); // deep copy
		delete metadata.position; // remove unnecessary data from the FrontMatterCache
		metadata = this.modelPropertyMapper.convertObjectBack(metadata);

		debugLog(metadata);

		if (!metadata?.type || !metadata?.dataSource || !metadata?.id) {
			throw new Error('MDB | active note is not a Media DB entry or is missing metadata');
		}

		let oldMediaTypeModel = this.mediaTypeManager.createMediaTypeModelFromMediaType(metadata, metadata.type);

		let newMediaTypeModel = await this.apiManager.queryDetailedInfoById(metadata.id, metadata.dataSource);
		if (!newMediaTypeModel) {
			return;
		}

		newMediaTypeModel = Object.assign(oldMediaTypeModel, newMediaTypeModel.getWithOutUserData());

		console.log('MDB | deleting old entry');
		await this.app.vault.delete(activeFile);
		await this.createMediaDbNoteFromModel(newMediaTypeModel);
	}

	async createEntriesFromFolder(folder: TFolder) {
		const erroredFiles: { filePath: string, error: string }[] = [];
		let canceled: boolean = false;

		const {selectedAPI, titleFieldName, appendContent} = await new Promise<{selectedAPI: string, titleFieldName: string, appendContent: boolean}>((resolve, reject) => {
			new MediaDbFolderImportModal(this.app, this, ((selectedAPI: string, titleFieldName: string, appendContent: boolean) => {
				resolve({selectedAPI, titleFieldName, appendContent});
			})).open();
		});

		for (const child of folder.children) {
			if (child instanceof TFile) {
				const file = child as TFile;
				if (canceled) {
					erroredFiles.push({filePath: file.path, error: 'user canceled'});
					continue;
				}

				let metadata: any = this.app.metadataCache.getFileCache(file).frontmatter;

				let title = metadata[titleFieldName];
				if (!title) {
					erroredFiles.push({filePath: file.path, error: `metadata field \'${titleFieldName}\' not found or empty`});
					continue;
				}

				let results: MediaTypeModel[] = [];
				try {
					results = await this.apiManager.query(title, [selectedAPI]);
				} catch (e) {
					erroredFiles.push({filePath: file.path, error: e.toString()});
					continue;
				}
				if (!results || results.length === 0) {
					erroredFiles.push({filePath: file.path, error: `no search results`});
					continue;
				}

				let selectedResults: MediaTypeModel[] = [];
				try {
					selectedResults = await new Promise((resolve, reject) => {
						const searchResultModal = new MediaDbSearchResultModal(this.app, this, results, true, (res, err) => {
							if (err) {
								return reject(err);
							}
							resolve(res);
						}, () => {
							reject(new UserCancelError('user canceled'));
						}, () => {
							reject(new UserSkipError('user skipped'));
						});

						searchResultModal.title = `Results for \'${title}\'`;
						searchResultModal.open();
					});
				} catch (e) {
					if (e instanceof UserCancelError) {
						erroredFiles.push({filePath: file.path, error: e.message});
						canceled = true;
						continue;
					} else if (e instanceof UserSkipError) {
						erroredFiles.push({filePath: file.path, error: e.message});
						continue;
					} else {
						erroredFiles.push({filePath: file.path, error: e.message});
						continue;
					}
				}

				if (selectedResults.length === 0) {
					erroredFiles.push({filePath: file.path, error: `no search results selected`});
					continue;
				}

				const detailedResults = await this.queryDetails(selectedResults);
				await this.createMediaDbNotes(detailedResults, appendContent ? file : null);
			}
		}

		if (erroredFiles.length > 0) {
			await this.createErroredFilesReport(erroredFiles);
		}
	}

	async createErroredFilesReport(erroredFiles: { filePath: string, error: string }[]): Promise<void> {
		const title = `bulk import error report ${dateTimeToString(new Date())}`;
		const filePath = `${this.settings.folder.replace(/\/$/, '')}/${title}.md`;

		const table = [['file', 'error']].concat(erroredFiles.map(x => [x.filePath, x.error]));
		// console.log(table)
		let fileContent = `# ${title}\n\n${markdownTable(table)}`;

		const targetFile = await this.app.vault.create(filePath, fileContent);
	}

	async openMediaDbAdvancedSearchModal(): Promise<{ query: string, apis: string[] }> {
		return await new Promise((resolve, reject) => {
			new MediaDbAdvancedSearchModal(this.app, this, (res, err) => {
				if (err) {
					return reject(err);
				}
				resolve(res)
			}).open();
		});
	}

	async openMediaDbIdSearchModal(): Promise<{ query: string, api: string }> {
		return await new Promise((resolve, reject) => {
			new MediaDbIdSearchModal(this.app, this, (res, err) => {
				if (err) {
					return reject(err);
				}
				resolve(res)
			}).open();
		});
	}

	async openMediaDbSelectModal(resultsToDisplay: MediaTypeModel[], skipButton: boolean = false): Promise<MediaTypeModel[]> {
		return await new Promise((resolve, reject) => {
			new MediaDbSearchResultModal(this.app, this, resultsToDisplay, skipButton, (res, err) => {
				if (err) {
					return reject(err);
				}
				resolve(res);
			}, () => {
				resolve([])
			}).open();
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		this.mediaTypeManager.updateTemplates(this.settings);
		this.modelPropertyMapper.updateConversionRules(this.settings);

		await this.saveData(this.settings);
	}
}
