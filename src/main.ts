import { MarkdownView, Notice, parseYaml, Plugin, stringifyYaml, TFolder, TFile } from 'obsidian';
import { requestUrl, normalizePath } from 'obsidian';
import { MediaType } from 'src/utils/MediaType';
import { APIManager } from './api/APIManager';
import { MUSICBRAINZ_NOTE_DATA_SOURCE, musicBrainzRegisteredApiName } from './api/musicBrainzConstants';
import { BoardGameGeekAPI } from './api/apis/BoardGameGeekAPI';
import { ComicVineAPI } from './api/apis/ComicVineAPI';
import { GiantBombAPI } from './api/apis/GiantBombAPI';
import { IGDBAPI } from './api/apis/IGDBAPI';
import { MALAPI } from './api/apis/MALAPI';
import { MALAPIManga } from './api/apis/MALAPIManga';
import { MobyGamesAPI } from './api/apis/MobyGamesAPI';
import { MusicBrainzAPI } from './api/apis/MusicBrainzAPI';
import { MusicBrainzBandAPI } from './api/apis/MusicBrainzBandAPI';
import { OMDbAPI } from './api/apis/OMDbAPI';
import { OpenLibraryAPI } from './api/apis/OpenLibraryAPI';
import { RAWGAPI } from './api/apis/RAWGAPI';
import { SteamAPI } from './api/apis/SteamAPI';
import { TMDBMovieAPI } from './api/apis/TMDBMovieAPI';
import { TMDBSeasonAPI } from './api/apis/TMDBSeasonAPI';
import { TMDBSeriesAPI } from './api/apis/TMDBSeriesAPI';
import { VNDBAPI } from './api/apis/VNDBAPI';
import { WikipediaAPI } from './api/apis/WikipediaAPI';
import { GeniusClient } from './api/GeniusClient';
import { SpotifyClient } from './api/SpotifyClient';
import { ConfirmOverwriteModal } from './modals/ConfirmOverwriteModal';
import { BulkUpdateConfirmModal } from './modals/BulkUpdateConfirmModal';
import type { SeasonSelectModalElement } from './modals/MediaDbSeasonSelectModal';
import { MediaDbSeasonSelectModal } from './modals/MediaDbSeasonSelectModal';
import type { BandModel } from './models/BandModel';
import type { MediaTypeModel } from './models/MediaTypeModel';
import type { MusicReleaseModel } from './models/MusicReleaseModel';
import type { SeasonModel } from './models/SeasonModel';
import { SongModel } from './models/SongModel';
import { ApiSecretID, getApiSecretValue } from './settings/apiSecretsHelper';
import { PropertyMapper } from './settings/PropertyMapper';
import { PropertyMappingModel } from './settings/PropertyMapping';
import type { MediaDbPluginSettings } from './settings/Settings';
import { getDefaultSettings, MediaDbSettingTab, propertyMappingModelsInDisplayOrder } from './settings/Settings';
import { AutoTrackerHelper } from './utils/AutoTrackerHelper';
import { BulkImportHelper } from './utils/BulkImportHelper';
import { BulkUpdateHelper } from './utils/BulkUpdateHelper';
import { DateFormatter } from './utils/DateFormatter';
import { MEDIA_TYPES, MediaTypeManager } from './utils/MediaTypeManager';
import { noteTypeValueForMedia, resolveMetadataTypeToMediaType } from './utils/noteTypeSettings';
import type { SearchModalOptions } from './utils/ModalHelper';
import { ModalHelper } from './utils/ModalHelper';
import type { CreateNoteOptions } from './utils/Utils';
import { normalizeTitleForAsciiAlias } from './utils/normalizeTitleForAlias';
import { replaceIllegalFileNameCharactersInString, unCamelCase, hasTemplaterPlugin, useTemplaterPluginInFile } from './utils/Utils';
import 'src/styles.css';

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
	bulkImportHelper!: BulkImportHelper;
	bulkUpdateHelper!: BulkUpdateHelper;
	autoTrackerHelper!: AutoTrackerHelper;
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
		this.apiManager.registerAPI(new MusicBrainzBandAPI(this));
		this.apiManager.registerAPI(new SteamAPI(this));
		this.apiManager.registerAPI(new TMDBSeriesAPI(this));
		this.apiManager.registerAPI(new TMDBSeasonAPI(this));
		this.apiManager.registerAPI(new TMDBMovieAPI(this));
		this.apiManager.registerAPI(new BoardGameGeekAPI(this));
		this.apiManager.registerAPI(new OpenLibraryAPI(this));
		this.apiManager.registerAPI(new ComicVineAPI(this));
		this.apiManager.registerAPI(new MobyGamesAPI(this));
		this.apiManager.registerAPI(new GiantBombAPI(this));
		this.apiManager.registerAPI(new IGDBAPI(this));
		this.apiManager.registerAPI(new RAWGAPI(this));
		this.apiManager.registerAPI(new VNDBAPI(this));

		this.mediaTypeManager = new MediaTypeManager();
		this.modelPropertyMapper = new PropertyMapper(this);
		this.modalHelper = new ModalHelper(this);
		this.bulkImportHelper = new BulkImportHelper(this);
		this.bulkUpdateHelper = new BulkUpdateHelper(this);
		this.autoTrackerHelper = new AutoTrackerHelper(this);
		this.dateFormatter = new DateFormatter();

		await this.loadSettings();
		// register the settings tab
		this.addSettingTab(new MediaDbSettingTab(this.app, this));

		this.mediaTypeManager.updateTemplates(this.settings);
		this.mediaTypeManager.updateFolders(this.settings);
		this.dateFormatter.setFormat(this.settings.customDateFormat);

		// add icon to the left ribbon and auto-tracker logic
		this.refreshAutoTrackerRibbon();

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.autoUpdateAiringMode) {
				setTimeout(() => {
					this.autoTrackerHelper.startBackgroundScan(true);
				}, 5000);
			}
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFolder) {
					// Add our customized context menu options under a "Media DB" group
					menu.addItem(item => {
						item.setTitle('Media DB...');
						item.setIcon('database');
						// @ts-ignore
						if (typeof item.setSubmenu === 'function') {
							// @ts-ignore
							const sub = item.setSubmenu();
							sub.addItem((subItem: any) => subItem.setTitle('Bulk Import Folder').setIcon('database').onClick(() => this.bulkImportHelper.import(file)));
							sub.addItem((subItem: any) => subItem.setTitle('Bulk Update Metadata').setIcon('refresh-cw').onClick(() => this.bulkUpdateHelper.updateFolder(file)));
							sub.addItem((subItem: any) => subItem.setTitle('Start Auto-Tracker in Folder').setIcon('sync').onClick(() => {
								new BulkUpdateConfirmModal(
									this.app,
									(silentUpdate: boolean) => {
										this.autoTrackerHelper.startBackgroundScan(silentUpdate, file);
									}).open();
							}));
							sub.addItem((subItem: any) => subItem.setTitle('Download images in folder').setIcon('image').onClick(() => this.downloadImagesInFolder(file)));
						} else {
							// Fallback if setSubmenu isn't in older Obsidian versions
							item.onClick(() => this.bulkUpdateHelper.updateFolder(file));
						}
					});
				}
			}),
		);

		this.addCommand({
			id: 'media-db-bulk-import-active-file-folder',
			name: 'Media DB: Bulk Import Folder (Active Context)',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile?.parent) return false;
				if (!checking) void this.bulkImportHelper.import(activeFile.parent);
				return true;
			},
		});

		this.addCommand({
			id: 'media-db-bulk-update-active-file-folder',
			name: 'Media DB: Bulk Update Metadata (Active Context)',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile?.parent) return false;
				if (!checking) void this.bulkUpdateHelper.updateFolder(activeFile.parent);
				return true;
			},
		});

		this.addCommand({
			id: 'media-db-download-images-active-file-folder',
			name: 'Media DB: Download images in folder (Active Context)',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile?.parent) return false;
				if (!checking) void this.downloadImagesInFolder(activeFile.parent);
				return true;
			},
		});

		this.addCommand({
			id: 'media-db-manual-sync-auto-tracker',
			name: 'Media DB: Force Auto-Tracker Background Scan',
			callback: () => this.autoTrackerHelper.startBackgroundScan(false),
		});

		// register command to open search modal
		this.addCommand({
			id: 'open-media-db-search-modal',
			name: 'Create Media DB entry',
			callback: () => this.createEntryWithSearchModal(),
		});
		for (const mediaType of MEDIA_TYPES) {
			this.addCommand({
				id: `open-media-db-search-modal-with-${mediaType}`,
				name: `Create Media DB entry: ${unCamelCase(mediaType)}`,
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
				return await this.apiManager.query(searchModalData.query, apis);
			} catch (e) {
				console.warn('MDB | Query failed:', e);
				new Notice(`Search failed: ${e}`);
				return [];
			}
		});

		if (!apiSearchResults || apiSearchResults.length === 0) {
			new Notice('No results found.');
			return;
		}

		// filter the results
		apiSearchResults = apiSearchResults.filter(x => types.contains(x.type));

		if (apiSearchResults.length === 0) {
			new Notice('No results found for the selected types.');
			return;
		}

		// Show selection modal - for seasons, skip detail query
		const selectResults =
			types.length === 1 && types[0] === 'season'
				? await this.modalHelper.openSelectModal(
						{
							elements: apiSearchResults,
							description: 'Select one search result to proceed.',
							submitButtonText: 'Ok',
						},
						async selectModalData => selectModalData.selected,
					)
				: await this.modalHelper.openSelectModal({ elements: apiSearchResults }, async selectModalData => this.queryDetails(selectModalData.selected));

		if (!selectResults || selectResults.length === 0) {
			return;
		}

		// Handle season selection for both direct season searches and series-to-season conversion
		const seasonHandlingResult = await this.handleSeasonWorkflow(types, selectResults);
		if (seasonHandlingResult.handled) {
			return;
		}

		// Show preview and confirm
		const confirmed = await this.modalHelper.openPreviewModal({ elements: selectResults }, async previewModalData => previewModalData.confirmed);
		if (!confirmed) {
			return;
		}

		// User confirmed, create notes and exit
		await this.createMediaDbNotes(selectResults);
	}

	/**
	 * Handles the season workflow for both direct season searches and series-to-season conversion.
	 * Returns an object indicating what happened and how to proceed.
	 */
	private async handleSeasonWorkflow(types: string[], selectResults: MediaTypeModel[]): Promise<{ handled: boolean; seasonsCreated?: boolean }> {
		// Case 1: User searched specifically for seasons and selected a series from TMDB
		if (types.length === 1 && types[0] === 'season' && selectResults.length === 1 && selectResults[0].dataSource === 'TMDBSeasonAPI') {
			const created = await this.showSeasonSelectAndCreate(selectResults[0].id, selectResults[0].englishTitle || selectResults[0].title);
			return { handled: true, seasonsCreated: created };
		}

		// Case 2: User searched for series but it's actually from TMDBSeasonAPI
		// (This happens when searching for seasons returns series results)
		if (types.includes('series') && selectResults.some(r => r.dataSource === 'TMDBSeriesAPI')) {
			const seriesResults = selectResults.filter(r => r.dataSource === 'TMDBSeriesAPI');
			// If only one series result and user searched for seasons, show season selection
			if (seriesResults.length === 1 && types.includes('season')) {
				const created = await this.showSeasonSelectAndCreate(seriesResults[0].id, seriesResults[0].title);
				return { handled: true, seasonsCreated: created };
			}
		}

		return { handled: false };
	}

	/**
	 * Shows the season selection modal for a given series and creates notes for selected seasons.
	 * Returns true if seasons were successfully created, false if cancelled.
	 */
	private async showSeasonSelectAndCreate(seriesId: string, seriesTitle: string): Promise<boolean> {
		const tmdbSeasonAPI = this.apiManager.getApiByName('TMDBSeasonAPI') as TMDBSeasonAPI;
		if (!tmdbSeasonAPI) {
			new Notice('TMDBSeasonAPI not available.');
			return false;
		}

		try {
			// Fetch all seasons for the selected series
			const allSeasons = await tmdbSeasonAPI.getSeasonsForSeries(seriesId);
			if (!allSeasons || allSeasons.length === 0) {
				new Notice('No seasons found for this series.');
				return false;
			}

			// Show season selection modal
			const selectedSeasons = await this.showSeasonSelectModal(allSeasons, seriesTitle);
			if (!selectedSeasons || selectedSeasons.length === 0) {
				return false;
			}

			// Create notes for all selected seasons in parallel
			await this.createNotesForSelectedSeasons(selectedSeasons, allSeasons, tmdbSeasonAPI);
			new Notice(`Successfully created ${selectedSeasons.length} season ${selectedSeasons.length === 1 ? 'entry' : 'entries'}.`);
			return true;
		} catch (e) {
			console.warn('MDB | Error in season selection workflow:', e);
			new Notice(`Error loading seasons: ${e}`);
			return false;
		}
	}

	/**
	 * Shows the season selection modal and returns the selected seasons.
	 */
	private async showSeasonSelectModal(allSeasons: SeasonModel[], seriesTitle: string): Promise<SeasonSelectModalElement[] | undefined> {
		const modal = new MediaDbSeasonSelectModal(
			this,
			allSeasons.map(s => ({
				season_number: s.seasonNumber,
				name: s.seasonTitle || s.title,
				episode_count: s.episodes || 0,
				air_date: s.year > 0 ? String(s.year) : 'unknown',
				poster_path: s.image,
			})),
			true,
			seriesTitle,
		);

		return new Promise(resolve => {
			modal.setSubmitCb(resolve);
			modal.open();
		});
	}

	/**
	 * Creates notes for all selected seasons by fetching full metadata and creating entries.
	 */
	private async createNotesForSelectedSeasons(selectedSeasons: SeasonSelectModalElement[], allSeasons: SeasonModel[], tmdbSeasonAPI: TMDBSeasonAPI): Promise<void> {
		await Promise.all(
			selectedSeasons.map(async selectedSeason => {
				const seasonModel = allSeasons.find(s => s.seasonNumber === selectedSeason.season_number);
				if (seasonModel) {
					try {
						// Fetch full metadata using getById
						const fullMetadata = await tmdbSeasonAPI.getById(seasonModel.id);
						await this.createMediaDbNotes([fullMetadata]);
					} catch (e) {
						console.warn(`MDB | Failed to create season ${selectedSeason.season_number}:`, e);
						new Notice(`Failed to create season ${selectedSeason.season_number}: ${e}`);
					}
				}
			}),
		);
	}

	async createEntryWithAdvancedSearchModal(): Promise<void> {
		const apiSearchResults = await this.modalHelper.openAdvancedSearchModal({}, async advancedSearchModalData => {
			return await this.apiManager.query(advancedSearchModalData.query, advancedSearchModalData.apis);
		});

		if (!apiSearchResults || apiSearchResults.length === 0) {
			new Notice('No results found.');
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
		const hasBand = models.some(m => m.getMediaType() === MediaType.Band);

		if (hasBand) {
			for (const model of models) {
				await this.createMediaDbNoteFromModel(model, { attachTemplate: true, attachFile: attachFile });
			}
			return;
		}

		const results = await Promise.allSettled(models.map(model => this.createMediaDbNoteFromModel(model, { attachTemplate: true, attachFile: attachFile })));

		const failures = results.filter(r => r.status === 'rejected');
		if (failures.length > 0) {
			console.warn('MDB | Some notes failed to create:', failures);
			new Notice(`${models.length - failures.length} of ${models.length} notes created successfully.`);
		}
	}

	async queryDetails(models: MediaTypeModel[]): Promise<MediaTypeModel[]> {
		// Query details in parallel for better performance
		const results = await Promise.allSettled(models.map(model => this.apiManager.queryDetailedInfo(model)));

		// Filter out failures and return successful results
		const detailModels: MediaTypeModel[] = results
			.filter((r): r is PromiseFulfilledResult<MediaTypeModel | undefined> => r.status === 'fulfilled' && r.value !== undefined)
			.map(r => r.value!);

		// Log failures for debugging
		const failures = results.filter(r => r.status === 'rejected');
		if (failures.length > 0) {
			console.warn('MDB | Some detail queries failed:', failures);
		}

		return detailModels;
	}

	async createMediaDbNoteFromModel(mediaTypeModel: MediaTypeModel, options: CreateNoteOptions): Promise<void> {
		if (mediaTypeModel.getMediaType() === MediaType.Band) {
			await this.importBandDiscography(mediaTypeModel as BandModel, options);
			return;
		}

		await this.createStandardMediaDbNoteFromModel(mediaTypeModel, options);
	}

	private async createStandardMediaDbNoteFromModel(mediaTypeModel: MediaTypeModel, options: CreateNoteOptions): Promise<void> {
		try {
			console.debug('MDB | creating new note');

			options.openNote ??= this.settings.openNoteInNewTab;

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

	private safeFileTreeSegment(title: string): string {
		return replaceIllegalFileNameCharactersInString(title).replaceAll(/ +/g, ' ').trim();
	}

	private async ensureVaultFolder(folderPath: string): Promise<TFolder> {
		const normalized = normalizePath(folderPath);
		if (!(await this.app.vault.adapter.exists(normalized))) {
			await this.app.vault.createFolder(normalized);
		}
		const folder = this.app.vault.getAbstractFileByPath(normalized);
		if (!(folder instanceof TFolder)) {
			throw new Error(`MDB | Expected folder at ${normalized}`);
		}
		return folder;
	}

	private async importBandDiscography(band: BandModel, options: CreateNoteOptions): Promise<void> {
		try {
			const geniusToken = getApiSecretValue(this.app, this.settings.linkedApiSecretIds, ApiSecretID.genius) || undefined;
			const genius = new GeniusClient(geniusToken);
			if (!genius.isConfigured()) {
				new Notice('Band import: add a Genius API access token in settings to fetch lyrics.');
			}

			const spotifyClientId = getApiSecretValue(this.app, this.settings.linkedApiSecretIds, ApiSecretID.spotifyClientId) || undefined;
			const spotifyClientSecret = getApiSecretValue(this.app, this.settings.linkedApiSecretIds, ApiSecretID.spotifyClientSecret) || undefined;
			const spotify = new SpotifyClient(spotifyClientId, spotifyClientSecret);

			const bandApi = this.apiManager.getApiByName('MusicBrainz Band API') as MusicBrainzBandAPI | undefined;
			const musicBrainzApi = this.apiManager.getApiByName('MusicBrainz API') as MusicBrainzAPI | undefined;
			if (!bandApi || !musicBrainzApi) {
				new Notice('MusicBrainz APIs not available.');
				return;
			}

			const useTree = this.settings.bandUseFileTreeForSongs;
			const childOptions: CreateNoteOptions = {
				attachTemplate: true,
				openNote: false,
				attachFile: undefined,
				folder: undefined,
			};

			const bandBaseFolder = await this.mediaTypeManager.getFolder(band, this.app);
			let bandNoteFolder = bandBaseFolder;
			let albumNotesFolder = bandBaseFolder;

			if (useTree) {
				const bandSeg = this.safeFileTreeSegment(band.title);
				const treeRootPath = normalizePath(`${bandBaseFolder.path}/${bandSeg}`);
				albumNotesFolder = await this.ensureVaultFolder(treeRootPath);
			}

			await this.createStandardMediaDbNoteFromModel(band, { ...options, folder: bandNoteFolder });

			let releaseGroupIds: string[];
			try {
				releaseGroupIds = await bandApi.listStudioAlbumReleaseGroupIds(band.id);
			} catch (e) {
				new Notice(`Could not load albums: ${e}`);
				return;
			}

			new Notice(`Importing ${releaseGroupIds.length} studio albums and tracks for ${band.title}…`);

			for (const rgId of releaseGroupIds) {
				await new Promise(r => setTimeout(r, 1100));
				let release: MusicReleaseModel;
				try {
					const model = await musicBrainzApi.getById(rgId);
					release = model as MusicReleaseModel;
				} catch (e) {
					console.warn(`MDB | Skipping release group ${rgId}:`, e);
					continue;
				}

				let songNotesFolder: TFolder | undefined;
				if (useTree) {
					const albumSeg = this.safeFileTreeSegment(release.title);
					songNotesFolder = await this.ensureVaultFolder(normalizePath(`${albumNotesFolder.path}/${albumSeg}`));
				}

				const releaseOpts: CreateNoteOptions = useTree ? { ...childOptions, folder: albumNotesFolder } : { ...childOptions };

				await this.createStandardMediaDbNoteFromModel(release, releaseOpts);

				for (const track of release.tracks) {
					let lyrics = '';
					let geniusUrl = '';
					if (genius.isConfigured()) {
						await new Promise(r => setTimeout(r, 500));
						const hit = await genius.searchFirstSongHit(`${band.title} ${track.title}`);
						if (hit) {
							geniusUrl = hit.url;
							await new Promise(r => setTimeout(r, 600));
							lyrics = await genius.fetchLyricsFromSongPage(hit.url);
						}
					}

					let spotifyUrl = '';
					if (track.recordingId) {
						await new Promise(r => setTimeout(r, 1100));
						try {
							spotifyUrl = await musicBrainzApi.fetchSpotifyUrlForRecording(track.recordingId);
						} catch (e) {
							console.warn(`MDB | Spotify URL for recording ${track.recordingId}:`, e);
						}
					}
					if (!spotifyUrl && spotify.isConfigured()) {
						const primaryArtist = release.artists[0] ?? band.title;
						console.log(`MDB | Spotify API fallback for track "${track.title}" (artist: ${primaryArtist})`);
						try {
							spotifyUrl = await spotify.searchFirstTrackUrl(track.title, primaryArtist);
						} catch (e) {
							console.warn(`MDB | Spotify search for "${track.title}":`, e);
						}
					}

					const song = new SongModel({
						type: 'song',
						title: track.title,
						englishTitle: track.title,
						year: release.year,
						releaseDate: release.releaseDate,
						dataSource: MUSICBRAINZ_NOTE_DATA_SOURCE,
						url: geniusUrl || release.url,
						id: `${release.id}-t${track.number}`,
						image: release.image,
						subType: 'song',
						genres: release.genres ?? [],
						artists: release.artists.length > 0 ? release.artists : [band.title],
						albumTitle: release.title,
						albumReleaseGroupId: release.id,
						trackNumber: track.number,
						duration: track.duration,
						featuredArtists: track.featuredArtists,
						geniusUrl,
						spotifyUrl,
						lyrics,
						userData: { personalRating: 0 },
					});

					const songOpts: CreateNoteOptions = useTree && songNotesFolder ? { ...childOptions, folder: songNotesFolder } : { ...childOptions };

					await this.createStandardMediaDbNoteFromModel(song, songOpts);
				}
			}

			new Notice(`Finished band import for ${band.title}.`);
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

	async downloadImagesInFolder(folder: TFolder): Promise<void> {
		new Notice(`MDB | Scanning for images to download in ${folder.name}...`);
		const files = folder.children.filter((c): c is TFile => c instanceof TFile && c.extension === 'md');
		let downloaded = 0;
		for (const file of files) {
			const metadata = this.getMetadataFromFileCache(file);
			if (typeof metadata.image === 'string' && metadata.image.startsWith('http')) {
				try {
					const imageUrl = metadata.image;
					const extMatch = imageUrl.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
					const ext = extMatch ? extMatch[1] : 'jpg';
					const imgName = replaceIllegalFileNameCharactersInString(file.basename) + '.' + ext;
					const imgFolder = await this.ensureVaultFolder(this.settings.imageFolder);
					const imagePath = `${imgFolder.path}/${imgName}`;

					if (!this.app.vault.getAbstractFileByPath(imagePath)) {
						const response = await requestUrl({ url: imageUrl, method: 'GET' });
						await this.app.vault.createBinary(imagePath, response.arrayBuffer);
					}

					await this.app.fileManager.processFrontMatter(file, (frontmatter: any) => {
						frontmatter.image = `[[${imagePath}]]`;
					});
					downloaded++;
				} catch (e) {
					console.error("MDB | Bulk Image download failed for", file.path, e);
				}
				await new Promise(r => setTimeout(r, 600)); // anti-rate limit
			}
		}
		new Notice(`MDB | Downloaded ${downloaded} remote images for notes in folder.`);
	}

	private metadataRecordForNewNote(mediaTypeModel: MediaTypeModel): Record<string, unknown> {
		let meta: Record<string, unknown>;
		if (this.settings.useDefaultFrontMatter) {
			meta = mediaTypeModel.toMetaDataObject();
		} else {
			meta = {
				id: mediaTypeModel.id,
				type: mediaTypeModel.type,
				dataSource: mediaTypeModel.dataSource,
			};
		}
		return meta;
	}

	generateMediaDbNoteFrontmatterPreview(mediaTypeModel: MediaTypeModel): string {
		mediaTypeModel.type = noteTypeValueForMedia(this.settings, mediaTypeModel.getMediaType());
		const fileMetadata = this.modelPropertyMapper.convertObject(this.metadataRecordForNewNote(mediaTypeModel));
		return stringifyYaml(fileMetadata);
	}

	/**
	 * Generates the content of a note from a media model and some options.
	 *
	 * @param mediaTypeModel
	 * @param options
	 */
	async generateMediaDbNoteContents(mediaTypeModel: MediaTypeModel, options: CreateNoteOptions): Promise<string> {
		mediaTypeModel.type = noteTypeValueForMedia(this.settings, mediaTypeModel.getMediaType());

		let template = await this.mediaTypeManager.getTemplate(mediaTypeModel, this.app);
		let fileMetadata: Record<string, unknown> = this.modelPropertyMapper.convertObject(
			this.metadataRecordForNewNote(mediaTypeModel),
		);

		let fileContent = '';
		template = options.attachTemplate ? template : '';

		({ fileMetadata, fileContent } = await this.attachFile(fileMetadata, fileContent, options.attachFile));
		({ fileMetadata, fileContent } = await this.attachTemplate(fileMetadata, fileContent, template));

		// --- Global Wiki-Link Post-Processing (for Custom/Manual Properties) ---
		const entityWikiProps = this.settings.autoTagEntities.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
		if (entityWikiProps.length > 0) {
			const folderPrefix = this.settings.wikiLinkFolder ? `${this.settings.wikiLinkFolder}/` : '';
			const isEnabled = this.settings.enableWikiLinkParsing;
			const formatWiki = (v: unknown) => {
				if (typeof v !== 'string') return v;
				let clean = v.replace(/^\[\[(.*?)\]\]$/, '$1');
				if (clean.includes('|')) clean = clean.split('|')[1];
				return isEnabled ? `[[${folderPrefix}${clean}|${clean}]]` : clean.trim();
			};

			for (const [key, value] of Object.entries(fileMetadata)) {
				if (key === 'aliases') continue;
				if (entityWikiProps.includes(key.toLowerCase())) {
					if (typeof value === 'string') {
						fileMetadata[key] = formatWiki(value);
					} else if (Array.isArray(value)) {
						fileMetadata[key] = value.map(formatWiki);
					}
				}
			}
		}

		// --- Auto-Tag Logic ---
		const tagProps = this.settings.autoTagProperties.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
		if (this.settings.enableAutoTagging && tagProps.length > 0) {
			const existingTags: string[] = Array.isArray(fileMetadata['tags']) ? (fileMetadata['tags'] as string[]) : [];
			const newTags = new Set<string>(existingTags.filter(t => typeof t === 'string' && t.trim() !== ''));

			for (const [key, value] of Object.entries(fileMetadata)) {
				if (tagProps.includes(key.toLowerCase()) && value) {
					const valuesToTag = Array.isArray(value) ? value : [value];
					for (let v of valuesToTag) {
						if (typeof v === 'string') {
							v = String(v).replace(/^\[\[(.*?)\]\]$/, '$1');
							if (v.includes('|')) {
								v = v.split('|')[1];
							}
							const sanitized = v
								.trim()
								.replace(/\s+/g, '-')
								.replace(/[^\wığüşöçIĞÜŞÖÇ-]/g, '')
								.toLowerCase();
							
							if (sanitized) newTags.add(sanitized);
						}
					}
				}
			}
			
			if (newTags.size > 0) {
				fileMetadata['tags'] = Array.from(newTags);
			}
		}

		if (mediaTypeModel.getMediaType() === MediaType.Song) {
			const song = mediaTypeModel as SongModel;
			if(song.lyrics.length > 0) {
				fileContent += `# Lyrics\n\`\`\`\n${song.lyrics}\n\`\`\`\n`;
			}
		}

		if (this.settings.enableTemplaterIntegration && hasTemplaterPlugin(this.app)) {
			// Include the media variable in all templater commands by using a top level JavaScript execution command.
			const mediaJson = JSON.stringify(mediaTypeModel, (key, value: unknown) => (key === 'lyrics' ? undefined : value));
			fileContent = `---\n<%* const media = ${mediaJson} %>\n${stringifyYaml(fileMetadata)}---\n${fileContent}`;
		} else {
			fileContent = `---\n${stringifyYaml(fileMetadata)}---\n${fileContent}`;
		}

		return fileContent;
	}

	extractManualTags(metadata: Record<string, unknown>, autoTagKeys: string): string[] {
		const allTagsRaw = metadata['tags'];
		const allTags = Array.isArray(allTagsRaw) ? allTagsRaw : typeof allTagsRaw === 'string' ? [allTagsRaw] : [];
		if (allTags.length === 0) return [];
		
		const tagProps = autoTagKeys.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
		const autoTagValues = new Set<string>();

		for (const [key, value] of Object.entries(metadata)) {
			if (tagProps.includes(key.toLowerCase()) && value) {
				const valuesToTag = Array.isArray(value) ? value : [value];
				for (const v of valuesToTag) {
					if (typeof v === 'string') {
						let clean = v.replace(/^\[\[(.*?)\]\]$/, '$1');
						if (clean.includes('|')) clean = clean.split('|')[1];
						const sanitized = clean.trim().replace(/\s+/g, '-').replace(/[^\wığüşöçIĞÜŞÖÇ-]/g, '').toLowerCase();
						if (sanitized) autoTagValues.add(sanitized);
					}
				}
			}
		}

		return allTags.map(t => String(t).trim()).filter(t => t && !autoTagValues.has(t.toLowerCase()) && !t.toLowerCase().startsWith('mediadb/'));
	}

	async attachFile(fileMetadata: Metadata, fileContent: string, fileToAttach?: TFile): Promise<{ fileMetadata: Metadata; fileContent: string }> {
		if (!fileToAttach) {
			return { fileMetadata: fileMetadata, fileContent: fileContent };
		}

		const attachFileMetadata = this.getMetadataFromFileCache(fileToAttach);
		
		// Rescue arrays that Object.assign would normally crush
		const rescueArray = (key: string) => {
			const arr = attachFileMetadata[key];
			if (Array.isArray(arr)) return [...arr as string[]];
			if (typeof arr === 'string' && arr.trim()) return [arr];
			return [];
		};
		const oldManualTags = this.extractManualTags(attachFileMetadata, this.settings.autoTagProperties);
		const oldAliases = rescueArray('aliases');

		// TODO: better object merging
		fileMetadata = Object.assign(attachFileMetadata, fileMetadata);

		// Merge tags cleanly (Preserving only manual user tags, discarding old ghost auto-tags!)
		const newObjTags = fileMetadata['tags'];
		const finalTags = new Set([...oldManualTags, ...(Array.isArray(newObjTags) ? newObjTags : typeof newObjTags === 'string' ? [newObjTags] : [])].map(t => String(t).trim()));
		if (finalTags.size > 0) fileMetadata['tags'] = Array.from(finalTags);

		// Merge aliases cleanly
		const newObjAliases = fileMetadata['aliases'];
		const finalAliases = new Set([...oldAliases, ...(Array.isArray(newObjAliases) ? newObjAliases : typeof newObjAliases === 'string' ? [newObjAliases] : [])].map(a => String(a).trim()));
		if (finalAliases.size > 0) fileMetadata['aliases'] = Array.from(finalAliases);

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
			let shouldOverwrite = options.overwrite;
			if (!shouldOverwrite) {
				shouldOverwrite = await new Promise<boolean>(resolve => {
					new ConfirmOverwriteModal(this.app, fileName, resolve).open();
				});
			}

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

	// --- AutoTracker Ribbon Logic ---
	public _ribbonEl: HTMLElement | null = null;
	refreshAutoTrackerRibbon() {
		if (!this._ribbonEl) {
			this._ribbonEl = this.addRibbonIcon('sync', 'Media DB: Auto-Tracker Sync', () => {
				if (this.autoTrackerHelper.isScanning) {
					new Notice("Auto-Tracker is currently syncing in the background.");
				} else {
					new BulkUpdateConfirmModal(
						this.app,
						(silentUpdate: boolean) => {
							this.autoTrackerHelper.startBackgroundScan(silentUpdate);
						}).open();
				}
			});
			this._ribbonEl.addClass('obsidian-media-db-plugin-ribbon-class');
		}

		if (this.autoTrackerHelper.isScanning) {
			this._ribbonEl.addClass('media-db-spin-animation');
		} else {
			this._ribbonEl.removeClass('media-db-spin-animation');
		}
	}

	/**
	 * Update the active note by querying the API again.
	 * Tries to read the type and id of the active note (and dataSource when required). If successful it will query the api, delete the old note and create a new one.
	 */
	async updateActiveNote(onlyMetadata: boolean = false): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile() ?? undefined;
		if (!activeFile) {
			throw new Error('MDB | there is no active note');
		}
		return this.updateNote(activeFile, onlyMetadata, true, false);
	}

	async updateNote(activeFile: TFile, onlyMetadata: boolean = false, openNoteFinal: boolean = true, overwrite: boolean = false): Promise<void> {

		let metadata = this.getMetadataFromFileCache(activeFile);
		metadata = this.modelPropertyMapper.convertObjectBack(metadata);

		console.debug(`MDB | read metadata`, metadata);

		if (!metadata?.type || !metadata?.id) {
			throw new Error('MDB | active note is not a Media DB entry or is missing metadata');
		}

		const mediaType = resolveMetadataTypeToMediaType(this.settings, metadata.type);
		if (mediaType === undefined) {
			throw new Error('MDB | active note type is not recognized; check Settings → Note type for each media kind');
		}
		let dataSource = typeof metadata.dataSource === 'string' ? metadata.dataSource.trim() : '';
		if (
			!dataSource &&
			musicBrainzRegisteredApiName(mediaType)
		) {
			dataSource = MUSICBRAINZ_NOTE_DATA_SOURCE;
		}
		if (!dataSource) {
			throw new Error('MDB | active note is missing dataSource (required for this media type)');
		}

		const validOldMetadata: MediaTypeModelObj = { ...metadata, dataSource } as unknown as MediaTypeModelObj;
		console.debug(`MDB | validOldMetadata`, validOldMetadata);

		const oldMediaTypeModel = this.mediaTypeManager.createMediaTypeModelFromMediaType(validOldMetadata, mediaType);
		console.debug(`MDB | oldMediaTypeModel created`, oldMediaTypeModel);

		let newMediaTypeModel = await this.apiManager.queryDetailedInfoById(validOldMetadata.id, validOldMetadata.dataSource, mediaType);
		if (!newMediaTypeModel) {
			return;
		}

		newMediaTypeModel = Object.assign(oldMediaTypeModel, newMediaTypeModel.getWithOutUserData());
		console.debug(`MDB | newMediaTypeModel after merge`, newMediaTypeModel);

		if (onlyMetadata) {
			await this.createMediaDbNoteFromModel(newMediaTypeModel, { attachFile: activeFile, folder: activeFile.parent ?? undefined, openNote: openNoteFinal, overwrite });
		} else {
			await this.createMediaDbNoteFromModel(newMediaTypeModel, { attachTemplate: true, folder: activeFile.parent ?? undefined, openNote: openNoteFinal, overwrite });
		}
	}

	async loadSettings(): Promise<void> {
		const diskSettings: MediaDbPluginSettings = (await this.loadData()) as MediaDbPluginSettings;
		const defaultSettings: MediaDbPluginSettings = getDefaultSettings(this);
		const loadedSettings: MediaDbPluginSettings = Object.assign({}, defaultSettings, diskSettings);

		// Migrate property mappings using the dedicated migration method
		const migratedModels = PropertyMappingModel.migrateModels(
			loadedSettings.propertyMappingModels || [],
			defaultSettings.propertyMappingModels.map(m => PropertyMappingModel.fromJSON(m)),
		);

		// Store as plain data for serialization (canonical order matches settings UI)
		loadedSettings.propertyMappingModels = propertyMappingModelsInDisplayOrder(migratedModels.map(m => m.toJSON()));

		this.settings = loadedSettings;
	}

	async saveSettings(): Promise<void> {
		this.mediaTypeManager.updateTemplates(this.settings);
		this.mediaTypeManager.updateFolders(this.settings);
		this.dateFormatter.setFormat(this.settings.customDateFormat);

		await this.saveData(this.settings);
	}
}
