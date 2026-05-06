import 'packages/obsidian/src/styles.css';
import { Plugin, TFolder } from 'obsidian';
import { APIManager } from 'packages/obsidian/src/api/APIManager';
import { BoardGameGeekAPI } from 'packages/obsidian/src/api/apis/BoardGameGeekAPI';
import { ComicVineAPI } from 'packages/obsidian/src/api/apis/ComicVineAPI';
import { IGDBAPI } from 'packages/obsidian/src/api/apis/IGDBAPI';
import { MALAPI } from 'packages/obsidian/src/api/apis/MALAPI';
import { MALAPIManga } from 'packages/obsidian/src/api/apis/MALAPIManga';
import { MusicBrainzAPI } from 'packages/obsidian/src/api/apis/MusicBrainzAPI';
import { OMDbAPI } from 'packages/obsidian/src/api/apis/OMDbAPI';
import { OpenLibraryAPI } from 'packages/obsidian/src/api/apis/OpenLibraryAPI';
import { RAWGAPI } from 'packages/obsidian/src/api/apis/RAWGAPI';
import { SteamAPI } from 'packages/obsidian/src/api/apis/SteamAPI';
import { TMDBMovieAPI } from 'packages/obsidian/src/api/apis/TMDBMovieAPI';
import { TMDBSeasonAPI } from 'packages/obsidian/src/api/apis/TMDBSeasonAPI';
import { TMDBSeriesAPI } from 'packages/obsidian/src/api/apis/TMDBSeriesAPI';
import { VNDBAPI } from 'packages/obsidian/src/api/apis/VNDBAPI';
import { WikipediaAPI } from 'packages/obsidian/src/api/apis/WikipediaAPI';
import { PropertyMapper } from 'packages/obsidian/src/settings/PropertyMapper';
import { PropertyMappingModel } from 'packages/obsidian/src/settings/PropertyMapping';
import type { MediaDbPluginSettings } from 'packages/obsidian/src/settings/Settings';
import { MediaDbSettingTab } from 'packages/obsidian/src/settings/Settings';
import { getDefaultSettings } from 'packages/obsidian/src/settings/Settings';
import { BulkImportHelper } from 'packages/obsidian/src/utils/BulkImportHelper';
import { DateFormatter } from 'packages/obsidian/src/utils/DateFormatter';
import { ErrorReporter } from 'packages/obsidian/src/utils/ErrorReporter';
import { MediaDbEntryHelper } from 'packages/obsidian/src/utils/MediaDbEntryHelper';
import { MediaDbFileHelper } from 'packages/obsidian/src/utils/MediaDbFileHelper';
import { MediaTypeManager } from 'packages/obsidian/src/utils/MediaTypeManager';
import { MEDIA_TYPES } from 'packages/obsidian/src/utils/MediaTypeManager';
import { ModalHelper } from 'packages/obsidian/src/utils/ModalHelper';
import { unCamelCase } from 'packages/obsidian/src/utils/Utils';

export default class MediaDbPlugin extends Plugin {
	settings!: MediaDbPluginSettings;
	apiManager!: APIManager;
	mediaTypeManager!: MediaTypeManager;
	modelPropertyMapper!: PropertyMapper;
	modalHelper!: ModalHelper;
	fileHelper!: MediaDbFileHelper;
	entryHelper!: MediaDbEntryHelper;
	bulkImportHelper!: BulkImportHelper;
	dateFormatter!: DateFormatter;
	errorReporter!: ErrorReporter;

	async onload(): Promise<void> {
		this.mediaTypeManager = new MediaTypeManager();
		this.modelPropertyMapper = new PropertyMapper(this);
		this.errorReporter = new ErrorReporter();
		this.modalHelper = new ModalHelper(this);
		this.fileHelper = new MediaDbFileHelper(this);
		this.entryHelper = new MediaDbEntryHelper(this);
		this.bulkImportHelper = new BulkImportHelper(this);
		this.dateFormatter = new DateFormatter();

		await this.loadSettings();
		this.registerDefaultApis();
		this.addSettingTab(new MediaDbSettingTab(this.app, this));
		this.registerRibbonAndFileMenu();
		this.registerCommands();
	}

	onunload(): void {}

	private registerDefaultApis(): void {
		this.apiManager = new APIManager();
		this.apiManager.registerAPI(new OMDbAPI(this));
		this.apiManager.registerAPI(new MALAPI(this));
		this.apiManager.registerAPI(new MALAPIManga(this));
		this.apiManager.registerAPI(new WikipediaAPI(this));
		this.apiManager.registerAPI(new MusicBrainzAPI(this));
		this.apiManager.registerAPI(new SteamAPI(this));
		this.apiManager.registerAPI(new TMDBSeriesAPI(this));
		this.apiManager.registerAPI(new TMDBSeasonAPI(this));
		this.apiManager.registerAPI(new TMDBMovieAPI(this));
		this.apiManager.registerAPI(new BoardGameGeekAPI(this));
		this.apiManager.registerAPI(new OpenLibraryAPI(this));
		this.apiManager.registerAPI(new ComicVineAPI(this));
		this.apiManager.registerAPI(new IGDBAPI(this));
		this.apiManager.registerAPI(new RAWGAPI(this));
		this.apiManager.registerAPI(new VNDBAPI(this));
	}

	private registerRibbonAndFileMenu(): void {
		const ribbonIconEl = this.addRibbonIcon('database', 'Add new Media DB entry', () => this.entryHelper.createEntryWithAdvancedSearchModal());
		ribbonIconEl.addClass('obsidian-media-db-plugin-ribbon-class');

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFolder) {
					menu.addItem(item => {
						item.setTitle('Import folder as Media DB entries')
							.setIcon('database')
							.onClick(() => this.bulkImportHelper.import(file));
					});
				}
			}),
		);
	}

	private registerCommands(): void {
		this.addCommand({
			id: 'open-media-db-search-modal',
			name: 'Create entry',
			callback: () => this.entryHelper.createEntryWithSearchModal(),
		});

		for (const mediaType of MEDIA_TYPES) {
			this.addCommand({
				id: `open-media-db-search-modal-with-${mediaType}`,
				name: `Create entry (${unCamelCase(mediaType)})`,
				callback: () => this.entryHelper.createEntryWithSearchModal({ preselectedTypes: [mediaType] }),
			});
		}

		this.addCommand({
			id: 'open-media-db-advanced-search-modal',
			name: 'Create entry (advanced search)',
			callback: () => this.entryHelper.createEntryWithAdvancedSearchModal(),
		});

		this.addCommand({
			id: 'open-media-db-id-search-modal',
			name: 'Create entry by id',
			callback: () => this.entryHelper.createEntryWithIdSearchModal(),
		});

		this.addCommand({
			id: 'update-media-db-note',
			name: 'Update open note (this will recreate the note)',
			checkCallback: (checking: boolean) => {
				if (!this.app.workspace.getActiveFile()) {
					return false;
				}
				if (!checking) {
					void this.fileHelper.updateActiveNote(false);
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
					void this.fileHelper.updateActiveNote(true);
				}
				return true;
			},
		});

		this.addCommand({
			id: 'add-media-db-link',
			name: 'Insert link',
			checkCallback: (checking: boolean) => {
				if (!this.app.workspace.getActiveFile()) {
					return false;
				}
				if (!checking) {
					void this.entryHelper.createLinkWithSearchModal();
				}
				return true;
			},
		});
	}

	async loadSettings(): Promise<void> {
		const diskSettings: MediaDbPluginSettings = (await this.loadData()) as MediaDbPluginSettings;
		const defaultSettings: MediaDbPluginSettings = getDefaultSettings(this);
		const loadedSettings: MediaDbPluginSettings = Object.assign({}, defaultSettings, diskSettings);

		// delete old api keys
		// @ts-ignore
		delete loadedSettings.BoardgameGeekKey;
		// @ts-ignore
		delete loadedSettings.ComicVineKey;
		// @ts-ignore
		delete loadedSettings.GiantBombKey;
		// @ts-ignore
		delete loadedSettings.MobyGamesKey;
		// @ts-ignore
		delete loadedSettings.OMDbKey;
		// @ts-ignore
		delete loadedSettings.TMDBKey;

		const migratedModels = PropertyMappingModel.migrateModels(
			loadedSettings.propertyMappingModels || [],
			defaultSettings.propertyMappingModels.map(m => PropertyMappingModel.fromJSON(m)),
		);

		loadedSettings.propertyMappingModels = migratedModels.map(m => m.toJSON());

		this.settings = loadedSettings;

		await this.saveSettings();
	}

	async saveSettings(): Promise<void> {
		this.mediaTypeManager.updateTemplates(this.settings);
		this.mediaTypeManager.updateFolders(this.settings);
		this.dateFormatter.setFormat(this.settings.customDateFormat);

		await this.saveData(this.settings);
	}
}
