import {Notice, parseYaml, Plugin, stringifyYaml, TFile, TFolder} from 'obsidian';
import {getDefaultSettings, MediaDbPluginSettings, MediaDbSettingTab} from './settings/Settings';
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
import {PropertyMapper} from './settings/PropertyMapper';
import {YAMLConverter} from './utils/YAMLConverter';
import {MediaDbFolderImportModal} from './modals/MediaDbFolderImportModal';
import {PropertyMapping, PropertyMappingModel} from './settings/PropertyMapping';

export default class MediaDbPlugin extends Plugin {
	settings: MediaDbPluginSettings;
	apiManager: APIManager;
	mediaTypeManager: MediaTypeManager;
	modelPropertyMapper: PropertyMapper;

	frontMatterRexExpPattern: string = '^(---)\\n[\\s\\S]*?\\n---';

	async onload() {
		this.apiManager = new APIManager();
		// register APIs
		this.apiManager.registerAPI(new OMDbAPI(this));
		this.apiManager.registerAPI(new MALAPI(this));
		this.apiManager.registerAPI(new WikipediaAPI(this));
		this.apiManager.registerAPI(new MusicBrainzAPI(this));
		this.apiManager.registerAPI(new SteamAPI(this));
		this.apiManager.registerAPI(new BoardGameGeekAPI(this));
		// this.apiManager.registerAPI(new LocGovAPI(this)); // TODO: parse data

		this.mediaTypeManager = new MediaTypeManager();
		this.modelPropertyMapper = new PropertyMapper(this);

		await this.loadSettings();
		// register the settings tab
		this.addSettingTab(new MediaDbSettingTab(this.app, this));

		// TESTING
		// this.settings.propertyMappingModels = getDefaultSettings(this).propertyMappingModels;

		this.mediaTypeManager.updateTemplates(this.settings);


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

		const {advancedSearchOptions, advancedSearchModal} = await this.openMediaDbAdvancedSearchModal();
		if (!advancedSearchOptions) {
			advancedSearchModal.close();
			return;
		}

		let apiSearchResults: MediaTypeModel[] = undefined;
		try {
			apiSearchResults = await this.apiManager.query(advancedSearchOptions.query, advancedSearchOptions.apis);
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
			advancedSearchModal.close();
			return;
		}

		advancedSearchModal.close();

		const {selectRes, selectModal} = await this.openMediaDbSelectModal(apiSearchResults, false);
		if (!selectRes) {
			selectModal.close();
			return;
		}

		try {
			results = await this.queryDetails(selectRes);
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
			selectModal.close();
			return;
		}

		selectModal.close();

		debugLog(results);
		if (results) {
			await this.createMediaDbNotes(results);
		}
	}

	async createEntryWithIdSearchModal() {
		let result: MediaTypeModel = undefined;

		const {idSearchOptions, idSearchModal} = await this.openMediaDbIdSearchModal();
		if (!idSearchOptions) {
			idSearchModal.close();
			return;
		}

		try {
			result = await this.apiManager.queryDetailedInfoById(idSearchOptions.query, idSearchOptions.api);
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
			idSearchModal.close();
			return;
		}

		idSearchModal.close();

		debugLog(result);
		if (result) {
			await this.createMediaDbNoteFromModel(result);
		}
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

			let fileContent = await this.generateMediaDbNoteContents(mediaTypeModel, attachFile);

			await this.createNote(this.mediaTypeManager.getFileName(mediaTypeModel), fileContent);
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
		}
	}

	private async generateMediaDbNoteContents(mediaTypeModel: MediaTypeModel, attachFile: TFile) {
		let fileMetadata = this.modelPropertyMapper.convertObject(mediaTypeModel.toMetaDataObject());
		let fileContent = '';

		({fileMetadata, fileContent} = await this.attachFile(fileMetadata, fileContent, attachFile));
		({fileMetadata, fileContent} = await this.attachTemplate(fileMetadata, fileContent, await this.mediaTypeManager.getTemplate(mediaTypeModel, this.app)));

		fileContent = `---\n${this.settings.useCustomYamlStringifier ? YAMLConverter.toYaml(fileMetadata) : stringifyYaml(fileMetadata)}---` + fileContent;
		return fileContent;
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
		fileContent += attachFileContent;

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
		fileContent += attachFileContent;

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
		await this.createMediaDbNoteFromModel(newMediaTypeModel, activeFile);
	}

	async createEntriesFromFolder(folder: TFolder) {
		const erroredFiles: { filePath: string, error: string }[] = [];
		let canceled: boolean = false;

		const {selectedAPI, titleFieldName, appendContent} = await new Promise<{ selectedAPI: string, titleFieldName: string, appendContent: boolean }>((resolve, reject) => {
			new MediaDbFolderImportModal(this.app, this, ((selectedAPI: string, titleFieldName: string, appendContent: boolean) => {
				resolve({selectedAPI, titleFieldName, appendContent});
			})).open();
		});

		for (const child of folder.children) {
			if (child instanceof TFile) {
				const file: TFile = child;
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
				const modal = new MediaDbSearchResultModal(this, results, true);
				try {
					selectedResults = await new Promise((resolve, reject) => {
						modal.title = `Results for \'${title}\'`;
						modal.setSubmitCallback(res => resolve(res));
						modal.setSkipCallback(() => reject(new UserCancelError('user skipped')));
						modal.setCloseCallback(err => {
							if (err) {
								reject(err);
							}
							reject(new UserCancelError('user canceled'));
						});

						modal.open();
					});
				} catch (e) {
					modal.close();
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

				modal.close();
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

		let fileContent = `# ${title}\n\n${markdownTable(table)}`;

		const targetFile = await this.app.vault.create(filePath, fileContent);
	}

	async openMediaDbAdvancedSearchModal(): Promise<{ advancedSearchOptions: { query: string, apis: string[] }, advancedSearchModal: MediaDbAdvancedSearchModal }> {
		const modal = new MediaDbAdvancedSearchModal(this);
		const res: { query: string, apis: string[] } = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve(res));
			modal.setCloseCallback(err => {
				if (err) {
					reject(err);
				}
				resolve(undefined);
			});

			modal.open();
		});
		return {advancedSearchOptions: res, advancedSearchModal: modal};
	}

	async openMediaDbIdSearchModal(): Promise<{ idSearchOptions: { query: string, api: string }, idSearchModal: MediaDbIdSearchModal }> {
		const modal = new MediaDbIdSearchModal(this);
		const res: { query: string, api: string } = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve(res));
			modal.setCloseCallback(err => {
				if (err) {
					reject(err);
				}
				resolve(undefined);
			});

			modal.open();
		});
		return {idSearchOptions: res, idSearchModal: modal};
	}

	async openMediaDbSelectModal(resultsToDisplay: MediaTypeModel[], skipButton: boolean = false): Promise<{ selectRes: MediaTypeModel[], selectModal: MediaDbSearchResultModal }> {
		const modal = new MediaDbSearchResultModal(this, resultsToDisplay, skipButton);
		const res: MediaTypeModel[] = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve(res));
			modal.setSkipCallback(() => resolve([]));
			modal.setCloseCallback(err => {
				if (err) {
					reject(err);
				}
				resolve(undefined);
			});

			modal.open();
		});
		return {selectRes: res, selectModal: modal};
	}

	async loadSettings() {
		// console.log(DEFAULT_SETTINGS);
		const diskSettings: MediaDbPluginSettings = await this.loadData();
		const defaultSettings: MediaDbPluginSettings = getDefaultSettings(this);
		const loadedSettings: MediaDbPluginSettings = Object.assign({}, defaultSettings, diskSettings);

		// migrate the settings loaded from the disk to match the structure of the default settings
		let newPropertyMappings: PropertyMappingModel[] = [];
		for (const defaultPropertyMappingModel of defaultSettings.propertyMappingModels) {
			let newPropertyMappingModel: PropertyMappingModel = loadedSettings.propertyMappingModels.find(x => x.type === defaultPropertyMappingModel.type);
			if (newPropertyMappingModel === undefined) { // if the propertyMappingModel exists in the default settings but not the loaded settings, add it
				newPropertyMappings.push(defaultPropertyMappingModel);
			} else { // if the propertyMappingModel also exists in the loaded settings, add it from there
				let newProperties: PropertyMapping[] = [];

				for (const defaultProperty of defaultPropertyMappingModel.properties) {
					let newProperty = newPropertyMappingModel.properties.find(x => x.property === defaultProperty.property);
					if (newProperty === undefined) {
						// default property is an instance
						newProperties.push(defaultProperty);
					} else {
						// newProperty is just an object and take locked status from default property
						newProperties.push(new PropertyMapping(newProperty.property, newProperty.newProperty, newProperty.mapping, defaultProperty.locked));
					}
				}

				newPropertyMappings.push(new PropertyMappingModel(newPropertyMappingModel.type, newProperties));
			}
		}
		loadedSettings.propertyMappingModels = newPropertyMappings;

		this.settings = loadedSettings;
	}

	async saveSettings() {
		this.mediaTypeManager.updateTemplates(this.settings);
		//this.modelPropertyMapper.updateConversionRules(this.settings);

		await this.saveData(this.settings);
	}
}
