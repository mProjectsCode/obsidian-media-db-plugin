import { MarkdownView, Notice, parseYaml, Plugin, stringifyYaml, TFile, TFolder } from 'obsidian';
import { requestUrl, normalizePath } from 'obsidian'; // Add requestUrl import
import type { MediaType } from 'src/utils/MediaType';
import { APIManager } from './api/APIManager';
import { BoardGameGeekAPI } from './api/apis/BoardGameGeekAPI';
import { ComicVineAPI } from './api/apis/ComicVineAPI';
import { GiantBombAPI } from './api/apis/GiantBombAPI';
import { MALAPI } from './api/apis/MALAPI';
import { MALAPIManga } from './api/apis/MALAPIManga';
import { MobyGamesAPI } from './api/apis/MobyGamesAPI';
import { MusicBrainzAPI } from './api/apis/MusicBrainzAPI';
import { OMDbAPI } from './api/apis/OMDbAPI';
import { OpenLibraryAPI } from './api/apis/OpenLibraryAPI';
import { SteamAPI } from './api/apis/SteamAPI';
import { WikipediaAPI } from './api/apis/WikipediaAPI';
import { ConfirmOverwriteModal } from './modals/ConfirmOverwriteModal';
import { MediaDbFolderImportModal } from './modals/MediaDbFolderImportModal';
import type { MediaTypeModel } from './models/MediaTypeModel';
import { PropertyMapper } from './settings/PropertyMapper';
import { PropertyMapping, PropertyMappingModel } from './settings/PropertyMapping';
import type { MediaDbPluginSettings } from './settings/Settings';
import { getDefaultSettings, MediaDbSettingTab } from './settings/Settings';
import { DateFormatter } from './utils/DateFormatter';
import { MEDIA_TYPES, MediaTypeManager } from './utils/MediaTypeManager';
import type { SearchModalOptions } from './utils/ModalHelper';
import { ModalHelper, ModalResultCode } from './utils/ModalHelper';
import type { CreateNoteOptions } from './utils/Utils';
import { dateTimeToString, markdownTable, replaceIllegalFileNameCharactersInString, unCamelCase, hasTemplaterPlugin, useTemplaterPluginInFile } from './utils/Utils';

export type Metadata = Record<string, unknown>;

export interface MediaTypeModelObj {
	id: string;
	type: MediaType;
	dataSource: string;
}

export default class MediaDbPlugin extends Plugin {
	settings!: MediaDbPluginSettings;
	apiManager!: APIManager;
	mediaTypeManager!: MediaTypeManager;
	modelPropertyMapper!: PropertyMapper;
	modalHelper!: ModalHelper;
	dateFormatter!: DateFormatter;

	frontMatterRexExpPattern: string = '^(---)\\n[\\s\\S]*?\\n---';

	async onload(): Promise<void> {
		this.apiManager = new APIManager();
		// register APIs
		this.apiManager.registerAPI(new OMDbAPI(this));
		this.apiManager.registerAPI(new MALAPI(this));
		this.apiManager.registerAPI(new MALAPIManga(this));
		this.apiManager.registerAPI(new WikipediaAPI(this));
		this.apiManager.registerAPI(new MusicBrainzAPI(this));
		this.apiManager.registerAPI(new SteamAPI(this));
		this.apiManager.registerAPI(new BoardGameGeekAPI(this));
		this.apiManager.registerAPI(new OpenLibraryAPI(this));
		this.apiManager.registerAPI(new ComicVineAPI(this));
		this.apiManager.registerAPI(new MobyGamesAPI(this));
		this.apiManager.registerAPI(new GiantBombAPI(this));
		// this.apiManager.registerAPI(new LocGovAPI(this)); // TODO: parse data

		this.mediaTypeManager = new MediaTypeManager();
		this.modelPropertyMapper = new PropertyMapper(this);
		this.modalHelper = new ModalHelper(this);
		this.dateFormatter = new DateFormatter();

		await this.loadSettings();
		// register the settings tab
		this.addSettingTab(new MediaDbSettingTab(this.app, this));

		this.mediaTypeManager.updateTemplates(this.settings);
		this.mediaTypeManager.updateFolders(this.settings);
		this.dateFormatter.setFormat(this.settings.customDateFormat);

		// add icon to the left ribbon
		const ribbonIconEl = this.addRibbonIcon('database', 'Add new Media DB entry', () => this.createEntryWithAdvancedSearchModal());
		ribbonIconEl.addClass('obsidian-media-db-plugin-ribbon-class');

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFolder) {
					menu.addItem(item => {
						item.setTitle('Import folder as Media DB entries')
							.setIcon('database')
							.onClick(() => this.createEntriesFromFolder(file));
					});
				}
			}),
		);

		// register command to open search modal
		this.addCommand({
			id: 'open-media-db-search-modal',
			name: 'Create Media DB entry',
			callback: () => this.createEntryWithSearchModal(),
		});
		for (const mediaType of MEDIA_TYPES) {
			this.addCommand({
				id: `open-media-db-search-modal-with-${mediaType}`,
				name: `Create Media DB entry (${unCamelCase(mediaType)})`,
				callback: () => this.createEntryWithSearchModal({ preselectedTypes: [mediaType] }),
			});
		}
		this.addCommand({
			id: 'open-media-db-advanced-search-modal',
			name: 'Create Media DB entry (advanced search)',
			callback: () => this.createEntryWithAdvancedSearchModal(),
		});
		// register command to open id search modal
		this.addCommand({
			id: 'open-media-db-id-search-modal',
			name: 'Create Media DB entry by id',
			callback: () => this.createEntryWithIdSearchModal(),
		});
		// register command to update the open note
		this.addCommand({
			id: 'update-media-db-note',
			name: 'Update open note (this will recreate the note)',
			checkCallback: (checking: boolean) => {
				if (!this.app.workspace.getActiveFile()) {
					return false;
				}
				if (!checking) {
					void this.updateActiveNote(false);
				}
				return true;
			},
		});
		this.addCommand({
			id: 'update-media-db-note-metadata',
			name: 'Update metadata',
			checkCallback: (checking: boolean) => {
				if (!this.app.workspace.getActiveFile()) {
					return false;
				}
				if (!checking) {
					void this.updateActiveNote(true);
				}
				return true;
			},
		});
		// register link insert command
		this.addCommand({
			id: 'add-media-db-link',
			name: 'Insert link',
			checkCallback: (checking: boolean) => {
				if (!this.app.workspace.getActiveFile()) {
					return false;
				}
				if (!checking) {
					void this.createLinkWithSearchModal();
				}
				return true;
			},
		});
	}

	/**
	 * first very simple approach
	 * TODO:
	 *  - replace the detail query
	 *  - maybe custom link syntax
	 */
	async createLinkWithSearchModal(): Promise<void> {
		const apiSearchResults = await this.modalHelper.openAdvancedSearchModal({}, async advancedSearchModalData => {
			return await this.apiManager.query(advancedSearchModalData.query, advancedSearchModalData.apis);
		});

		if (!apiSearchResults) {
			return;
		}

		const selectResults = await this.modalHelper.openSelectModal({ elements: apiSearchResults, multiSelect: false }, async selectModalData => {
			return await this.queryDetails(selectModalData.selected);
		});

		if (!selectResults || selectResults.length < 1) {
			return;
		}

		const link = `[${selectResults[0].title}](${selectResults[0].url})`;

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		// Make sure the user is editing a Markdown file.
		if (view) {
			view.editor.replaceRange(link, view.editor.getCursor());
		}
	}

	async createEntryWithSearchModal(searchModalOptions?: SearchModalOptions): Promise<void> {
		let types: string[] = [];
		let apiSearchResults = await this.modalHelper.openSearchModal(searchModalOptions ?? {}, async searchModalData => {
			types = searchModalData.types;
			const apis = this.apiManager.apis.filter(x => x.hasTypeOverlap(searchModalData.types)).map(x => x.apiName);
			try {
				console.log(apis);
				return await this.apiManager.query(searchModalData.query, apis);
			} catch (e) {
				console.warn(e);
				return [];
			}
		});

		if (!apiSearchResults) {
			// TODO: add new notice saying no results found?
			return;
		}

		// filter the results
		apiSearchResults = apiSearchResults.filter(x => types.contains(x.type));

		let selectResults: MediaTypeModel[];
		const proceed: boolean = false;

		while (!proceed) {
			selectResults =
				(await this.modalHelper.openSelectModal({ elements: apiSearchResults }, async selectModalData => {
					return await this.queryDetails(selectModalData.selected);
				})) ?? [];
			if (!selectResults || selectResults.length < 1) {
				return;
			}

			const confirmed = await this.modalHelper.openPreviewModal({ elements: selectResults }, async previewModalData => {
				return previewModalData.confirmed;
			});
			if (!confirmed) {
				return;
			}
			break;
		}

		await this.createMediaDbNotes(selectResults!);
	}

	async createEntryWithAdvancedSearchModal(): Promise<void> {
		const apiSearchResults = await this.modalHelper.openAdvancedSearchModal({}, async advancedSearchModalData => {
			return await this.apiManager.query(advancedSearchModalData.query, advancedSearchModalData.apis);
		});

		if (!apiSearchResults) {
			// TODO: add new notice saying no results found?
			return;
		}

		let selectResults: MediaTypeModel[];
		const proceed: boolean = false;

		while (!proceed) {
			selectResults =
				(await this.modalHelper.openSelectModal({ elements: apiSearchResults }, async selectModalData => {
					return await this.queryDetails(selectModalData.selected);
				})) ?? [];
			if (!selectResults || selectResults.length < 1) {
				return;
			}

			const confirmed = await this.modalHelper.openPreviewModal({ elements: selectResults }, async previewModalData => {
				return previewModalData.confirmed;
			});
			if (!confirmed) {
				return;
			}
			break;
		}

		await this.createMediaDbNotes(selectResults!);
	}

	async createEntryWithIdSearchModal(): Promise<void> {
		let idSearchResult: MediaTypeModel | undefined = undefined;
		let proceed: boolean = false;

		while (!proceed) {
			idSearchResult = await this.modalHelper.openIdSearchModal({}, async idSearchModalData => {
				return await this.apiManager.queryDetailedInfoById(idSearchModalData.query, idSearchModalData.api);
			});
			if (!idSearchResult) {
				return;
			}

			proceed = await this.modalHelper.openPreviewModal({ elements: [idSearchResult] }, async previewModalData => {
				return previewModalData.confirmed;
			});
		}

		if (!idSearchResult) {
			return;
		}
		await this.createMediaDbNoteFromModel(idSearchResult, { attachTemplate: true, openNote: true });
	}

	async createMediaDbNotes(models: MediaTypeModel[], attachFile?: TFile): Promise<void> {
		for (const model of models) {
			await this.createMediaDbNoteFromModel(model, { attachTemplate: true, attachFile: attachFile });
		}
	}

	async queryDetails(models: MediaTypeModel[]): Promise<MediaTypeModel[]> {
		const detailModels: MediaTypeModel[] = [];
		for (const model of models) {
			const res = await this.apiManager.queryDetailedInfo(model);
			if (res) {
				detailModels.push(res);
			}
		}
		return detailModels;
	}

	async createMediaDbNoteFromModel(mediaTypeModel: MediaTypeModel, options: CreateNoteOptions): Promise<void> {
		try {
			console.debug('MDB | creating new note');

			options.openNote = this.settings.openNoteInNewTab;

			if (this.settings.imageDownload) {
				await this.downloadImageForMediaModel(mediaTypeModel);
			}

			const fileContent = await this.generateMediaDbNoteContents(mediaTypeModel, options);

			options.folder ??= await this.mediaTypeManager.getFolder(mediaTypeModel, this.app);

			const targetFile = await this.createNote(this.mediaTypeManager.getFileName(mediaTypeModel), fileContent, options);

			if (this.settings.enableTemplaterIntegration) {
				await useTemplaterPluginInFile(this.app, targetFile);
			}
		} catch (e) {
			console.warn(e);
			new Notice(`${e}`);
		}
	}

	/**
	 * Tries to download the image for a media model.
	 *
	 * @param mediaTypeModel
	 * @returns true if the image was downloaded, false otherwise
	 */
	private async downloadImageForMediaModel(mediaTypeModel: MediaTypeModel): Promise<boolean> {
		if (mediaTypeModel.image && typeof mediaTypeModel.image === 'string' && mediaTypeModel.image.startsWith('http')) {
			try {
				const imageUrl = mediaTypeModel.image;
				const imageExt = imageUrl.split('.').pop()?.split(/#|\?/)[0] ?? 'jpg';
				const imageFileName = `${replaceIllegalFileNameCharactersInString(`${mediaTypeModel.type}_${mediaTypeModel.title} (${mediaTypeModel.year})`)}.${imageExt}`;
				const imagePath = normalizePath(`${this.settings.imageFolder}/${imageFileName}`);

				if (!this.app.vault.getAbstractFileByPath(this.settings.imageFolder)) {
					await this.app.vault.createFolder(this.settings.imageFolder);
				}

				if (!this.app.vault.getAbstractFileByPath(imagePath)) {
					const response = await requestUrl({ url: imageUrl, method: 'GET' });
					await this.app.vault.createBinary(imagePath, response.arrayBuffer);
				}

				// Update model to use local image path
				mediaTypeModel.image = `[[${imagePath}]]`;
				return true;
			} catch (e) {
				console.warn('MDB | Failed to download image:', e);
			}
		}

		return false;
	}

	generateMediaDbNoteFrontmatterPreview(mediaTypeModel: MediaTypeModel): string {
		const fileMetadata = this.modelPropertyMapper.convertObject(mediaTypeModel.toMetaDataObject());
		return stringifyYaml(fileMetadata);
	}

	/**
	 * Generates the content of a note from a media model and some options.
	 *
	 * @param mediaTypeModel
	 * @param options
	 */
	async generateMediaDbNoteContents(mediaTypeModel: MediaTypeModel, options: CreateNoteOptions): Promise<string> {
		const template = await this.mediaTypeManager.getTemplate(mediaTypeModel, this.app);

		return this.generateContentWithDefaultFrontMatter(mediaTypeModel, options, template);

		// if (this.settings.useDefaultFrontMatter || !template) {
		// 	return this.generateContentWithDefaultFrontMatter(mediaTypeModel, options, template);
		// } else {
		// 	return this.generateContentWithCustomFrontMatter(mediaTypeModel, options, template);
		// }
	}

	async generateContentWithDefaultFrontMatter(mediaTypeModel: MediaTypeModel, options: CreateNoteOptions, template?: string): Promise<string> {
		let fileMetadata: Record<string, unknown>;

		if (this.settings.useDefaultFrontMatter) {
			fileMetadata = this.modelPropertyMapper.convertObject(mediaTypeModel.toMetaDataObject());
		} else {
			fileMetadata = {
				id: mediaTypeModel.id,
				type: mediaTypeModel.type,
				dataSource: mediaTypeModel.dataSource,
			};
		}

		let fileContent = '';
		template = options.attachTemplate ? template : '';

		({ fileMetadata, fileContent } = await this.attachFile(fileMetadata, fileContent, options.attachFile));
		({ fileMetadata, fileContent } = await this.attachTemplate(fileMetadata, fileContent, template));

		if (this.settings.enableTemplaterIntegration && hasTemplaterPlugin(this.app)) {
			// Include the media variable in all templater commands by using a top level JavaScript execution command.
			fileContent = `---\n<%* const media = ${JSON.stringify(mediaTypeModel)} %>\n${stringifyYaml(fileMetadata)}---\n${fileContent}`;
		} else {
			fileContent = `---\n${stringifyYaml(fileMetadata)}---\n${fileContent}`;
		}

		return fileContent;
	}

	async generateContentWithCustomFrontMatter(mediaTypeModel: MediaTypeModel, options: CreateNoteOptions, template: string): Promise<string> {
		const regExp = new RegExp(this.frontMatterRexExpPattern);

		const frontMatter = this.getMetaDataFromFileContent(template);
		let fileContent: string = template.replace(regExp, '');

		// Updating a previous file
		if (options.attachFile) {
			const previousMetadata = this.app.metadataCache.getFileCache(options.attachFile)?.frontmatter ?? {};

			// Use contents (below front matter) from previous file
			fileContent = await this.app.vault.read(options.attachFile);

			fileContent = fileContent.replace(regExp, '');
			fileContent = fileContent.startsWith('\n') ? fileContent.substring(1) : fileContent;

			// Update updated front matter with entries from the old front matter, if it isn't defined in the new front matter
			Object.keys(previousMetadata).forEach(key => {
				const value: unknown = previousMetadata[key];

				if (!frontMatter[key] && value) {
					frontMatter[key] = value;
				}
			});
		}

		// Ensure that id, type, and dataSource are defined
		frontMatter.id ??= mediaTypeModel.id;
		frontMatter.type ??= mediaTypeModel.type;
		frontMatter.dataSource ??= mediaTypeModel.dataSource;

		if (this.settings.enableTemplaterIntegration && hasTemplaterPlugin(this.app)) {
			// Only support stringifyYaml for templater plugin
			// Include the media variable in all templater commands by using a top level JavaScript execution command.
			fileContent = `---\n<%* const media = ${JSON.stringify(mediaTypeModel)} %>\n${stringifyYaml(frontMatter)}---\n${fileContent}`;
		} else {
			fileContent = `---\n${stringifyYaml(frontMatter)}---\n${fileContent}`;
		}

		return fileContent;
	}

	async attachFile(fileMetadata: Metadata, fileContent: string, fileToAttach?: TFile): Promise<{ fileMetadata: Metadata; fileContent: string }> {
		if (!fileToAttach) {
			return { fileMetadata: fileMetadata, fileContent: fileContent };
		}

		const attachFileMetadata = this.getMetadataFromFileCache(fileToAttach);
		// TODO: better object merging
		fileMetadata = Object.assign(attachFileMetadata, fileMetadata);

		let attachFileContent: string = await this.app.vault.read(fileToAttach);
		const regExp = new RegExp(this.frontMatterRexExpPattern);
		attachFileContent = attachFileContent.replace(regExp, '');
		attachFileContent = attachFileContent.startsWith('\n') ? attachFileContent.substring(1) : attachFileContent;
		fileContent += attachFileContent;

		return { fileMetadata: fileMetadata, fileContent: fileContent };
	}

	async attachTemplate(fileMetadata: Metadata, fileContent: string, template: string | undefined): Promise<{ fileMetadata: Metadata; fileContent: string }> {
		if (!template) {
			return { fileMetadata: fileMetadata, fileContent: fileContent };
		}

		const templateMetadata = this.getMetaDataFromFileContent(template);
		// TODO: better object merging
		fileMetadata = Object.assign(templateMetadata, fileMetadata);

		const regExp = new RegExp(this.frontMatterRexExpPattern);
		const attachFileContent = template.replace(regExp, '');
		fileContent += attachFileContent;

		return { fileMetadata: fileMetadata, fileContent: fileContent };
	}

	getMetaDataFromFileContent(fileContent: string): Metadata {
		let metadata: Metadata;

		const regExp = new RegExp(this.frontMatterRexExpPattern);
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

		metadata = parseYaml(frontMatter) as Metadata;

		if (!metadata) {
			metadata = {};
		}

		console.debug(`MDB | metadata read from file content`, metadata);

		return metadata;
	}

	getMetadataFromFileCache(file: TFile): Metadata {
		const metadata: Metadata | undefined = this.app.metadataCache.getFileCache(file)?.frontmatter;
		return structuredClone(metadata ?? {});
	}

	/**
	 * Creates a note in the vault.
	 *
	 * @param fileName
	 * @param fileContent
	 * @param options
	 */
	async createNote(fileName: string, fileContent: string, options: CreateNoteOptions): Promise<TFile> {
		// find and possibly create the folder set in settings or passed in folder
		const folder = options.folder ?? this.app.vault.getAbstractFileByPath('/');

		if (!folder || !(folder instanceof TFolder)) {
			throw new Error('MDB | invalid folder');
		}

		fileName = replaceIllegalFileNameCharactersInString(fileName);
		const filePath = `${folder.path}/${fileName}.md`;

		// look if file already exists and ask if it should be overwritten
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file) {
			const shouldOverwrite = await new Promise<boolean>(resolve => {
				new ConfirmOverwriteModal(this.app, fileName, resolve).open();
			});

			if (!shouldOverwrite) {
				throw new Error('MDB | file creation cancelled by user');
			}

			await this.app.vault.delete(file);
		}

		// create the file
		const targetFile = await this.app.vault.create(filePath, fileContent);
		console.debug(`MDB | created new file at ${filePath}`);

		// open newly created file
		if (options.openNote) {
			const activeLeaf = this.app.workspace.getUnpinnedLeaf();
			if (!activeLeaf) {
				console.warn('MDB | no active leaf, not opening newly created note');
				return targetFile;
			}
			await activeLeaf.openFile(targetFile, { state: { mode: 'source' } });
		}

		return targetFile;
	}

	/**
	 * Update the active note by querying the API again.
	 * Tries to read the type, id and dataSource of the active note. If successful it will query the api, delete the old note and create a new one.
	 */
	async updateActiveNote(onlyMetadata: boolean = false): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile() ?? undefined;
		if (!activeFile) {
			throw new Error('MDB | there is no active note');
		}

		let metadata = this.getMetadataFromFileCache(activeFile);
		metadata = this.modelPropertyMapper.convertObjectBack(metadata);

		console.debug(`MDB | read metadata`, metadata);

		if (!metadata?.type || !metadata?.dataSource || !metadata?.id) {
			throw new Error('MDB | active note is not a Media DB entry or is missing metadata');
		}

		const validOldMetadata: MediaTypeModelObj = metadata as unknown as MediaTypeModelObj;
		console.debug(`MDB | validOldMetadata`, validOldMetadata);

		const oldMediaTypeModel = this.mediaTypeManager.createMediaTypeModelFromMediaType(validOldMetadata, validOldMetadata.type);
		console.debug(`MDB | oldMediaTypeModel created`, oldMediaTypeModel);

		let newMediaTypeModel = await this.apiManager.queryDetailedInfoById(validOldMetadata.id, validOldMetadata.dataSource);
		if (!newMediaTypeModel) {
			return;
		}

		newMediaTypeModel = Object.assign(oldMediaTypeModel, newMediaTypeModel.getWithOutUserData());
		console.debug(`MDB | newMediaTypeModel after merge`, newMediaTypeModel);

		if (onlyMetadata) {
			await this.createMediaDbNoteFromModel(newMediaTypeModel, { attachFile: activeFile, folder: activeFile.parent ?? undefined, openNote: true });
		} else {
			await this.createMediaDbNoteFromModel(newMediaTypeModel, { attachTemplate: true, folder: activeFile.parent ?? undefined, openNote: true });
		}
	}

	async createEntriesFromFolder(folder: TFolder): Promise<void> {
		const erroredFiles: { filePath: string; error: string }[] = [];
		let canceled: boolean = false;

		const { selectedAPI, titleFieldName, idFieldName, appendContent } = await new Promise<{
			selectedAPI: string;
			titleFieldName: string;
			idFieldName: string;
			appendContent: boolean;
		}>(resolve => {
			new MediaDbFolderImportModal(this.app, this, (selectedAPI: string, titleFieldName: string, idFieldName: string, appendContent: boolean) => {
				resolve({ selectedAPI, titleFieldName, idFieldName, appendContent });
			}).open();
		});

		for (const child of folder.children) {
			if (child instanceof TFile) {
				const file: TFile = child;
				if (canceled) {
					erroredFiles.push({ filePath: file.path, error: 'user canceled' });
					continue;
				}

				const metadata = this.getMetadataFromFileCache(file);

				// Querying by ID takes priority, doesn't require user to select from multiple matches
				const id = metadata[idFieldName];
				if (id && typeof id === 'string') {
					try {
						const model = await this.apiManager.queryDetailedInfoById(id, selectedAPI);
						if (model) {
							await this.createMediaDbNotes([model], appendContent ? file : undefined);
						} else {
							erroredFiles.push({ filePath: file.path, error: `Failed to query API with id: ${id}` });
						}
					} catch (e) {
						erroredFiles.push({ filePath: file.path, error: `${e}` });
						continue;
					}
				} else {
					// Query API with title instead, requires user to select best match
					const title = metadata[titleFieldName];
					if (!title || typeof title !== 'string') {
						erroredFiles.push({ filePath: file.path, error: `metadata field '${titleFieldName}' not found, empty, or not a string` });
						continue;
					}

					let results: MediaTypeModel[] = [];
					try {
						results = await this.apiManager.query(title, [selectedAPI]);
					} catch (e) {
						erroredFiles.push({ filePath: file.path, error: `${e}` });
						continue;
					}
					if (!results || results.length === 0) {
						erroredFiles.push({ filePath: file.path, error: `no search results` });
						continue;
					}

					const { selectModalResult, selectModal } = await this.modalHelper.createSelectModal({
						elements: results,
						skipButton: true,
						modalTitle: `Results for '${title}'`,
					});

					if (selectModalResult.code === ModalResultCode.ERROR) {
						erroredFiles.push({ filePath: file.path, error: selectModalResult.error.message });
						selectModal.close();
						continue;
					}

					if (selectModalResult.code === ModalResultCode.CLOSE) {
						erroredFiles.push({ filePath: file.path, error: 'user canceled' });
						selectModal.close();
						canceled = true;
						continue;
					}

					if (selectModalResult.code === ModalResultCode.SKIP) {
						erroredFiles.push({ filePath: file.path, error: 'user skipped' });
						selectModal.close();
						continue;
					}

					if (selectModalResult.data.selected.length === 0) {
						erroredFiles.push({ filePath: file.path, error: `no search results selected` });
						continue;
					}

					const detailedResults = await this.queryDetails(selectModalResult.data.selected);
					await this.createMediaDbNotes(detailedResults, appendContent ? file : undefined);

					selectModal.close();
				}
			}
		}

		if (erroredFiles.length > 0) {
			await this.createErroredFilesReport(erroredFiles);
		}
	}

	async createErroredFilesReport(erroredFiles: { filePath: string; error: string }[]): Promise<void> {
		const title = `MDB - bulk import error report ${dateTimeToString(new Date())}`;
		const filePath = `${title}.md`;

		const table = [['file', 'error']].concat(erroredFiles.map(x => [x.filePath, x.error]));

		const fileContent = `# ${title}\n\n${markdownTable(table)}`;
		await this.app.vault.create(filePath, fileContent);
	}

	async loadSettings(): Promise<void> {
		// console.log(DEFAULT_SETTINGS);
		const diskSettings: MediaDbPluginSettings = (await this.loadData()) as MediaDbPluginSettings;
		const defaultSettings: MediaDbPluginSettings = getDefaultSettings(this);
		const loadedSettings: MediaDbPluginSettings = Object.assign({}, defaultSettings, diskSettings);

		// migrate the settings loaded from the disk to match the structure of the default settings
		const newPropertyMappings: PropertyMappingModel[] = [];
		for (const defaultPropertyMappingModel of defaultSettings.propertyMappingModels) {
			const newPropertyMappingModel = loadedSettings.propertyMappingModels.find(x => x.type === defaultPropertyMappingModel.type);
			if (newPropertyMappingModel === undefined) {
				// if the propertyMappingModel exists in the default settings but not the loaded settings, add it
				newPropertyMappings.push(defaultPropertyMappingModel);
			} else {
				// if the propertyMappingModel also exists in the loaded settings, add it from there
				const newProperties: PropertyMapping[] = [];

				for (const defaultProperty of defaultPropertyMappingModel.properties) {
					const newProperty = newPropertyMappingModel.properties.find(x => x.property === defaultProperty.property);
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

	async saveSettings(): Promise<void> {
		this.mediaTypeManager.updateTemplates(this.settings);
		this.mediaTypeManager.updateFolders(this.settings);
		this.dateFormatter.setFormat(this.settings.customDateFormat);

		await this.saveData(this.settings);
	}
}
