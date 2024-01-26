import { MediaDbPluginSettings } from '../settings/Settings';
import { MediaType } from './MediaType';
import { MediaTypeModel } from '../models/MediaTypeModel';
import { replaceTags } from './Utils';
import { App, TAbstractFile, TFile, TFolder } from 'obsidian';
import { MovieModel } from '../models/MovieModel';
import { SeriesModel } from '../models/SeriesModel';
import { MangaModel } from '../models/MangaModel';
import { GameModel } from '../models/GameModel';
import { WikiModel } from '../models/WikiModel';
import { MusicReleaseModel } from '../models/MusicReleaseModel';
import { BoardGameModel } from '../models/BoardGameModel';
import { BookModel } from '../models/BookModel';

export const MEDIA_TYPES: MediaType[] = [
	MediaType.Movie,
	MediaType.Series,
	MediaType.Manga,
	MediaType.Game,
	MediaType.Wiki,
	MediaType.MusicRelease,
	MediaType.BoardGame,
	MediaType.Book,
];

export class MediaTypeManager {
	mediaFileNameTemplateMap: Map<MediaType, string>;
	mediaTemplateMap: Map<MediaType, string>;
	mediaFolderMap: Map<MediaType, string>;

	constructor() {}

	updateTemplates(settings: MediaDbPluginSettings): void {
		this.mediaFileNameTemplateMap = new Map<MediaType, string>();
		this.mediaFileNameTemplateMap.set(MediaType.Movie, settings.movieFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Series, settings.seriesFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Manga, settings.mangaFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Game, settings.gameFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Wiki, settings.wikiFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.MusicRelease, settings.musicReleaseFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.BoardGame, settings.boardgameFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Book, settings.bookFileNameTemplate);

		this.mediaTemplateMap = new Map<MediaType, string>();
		this.mediaTemplateMap.set(MediaType.Movie, settings.movieTemplate);
		this.mediaTemplateMap.set(MediaType.Series, settings.seriesTemplate);
		this.mediaTemplateMap.set(MediaType.Manga, settings.mangaTemplate);
		this.mediaTemplateMap.set(MediaType.Game, settings.gameTemplate);
		this.mediaTemplateMap.set(MediaType.Wiki, settings.wikiTemplate);
		this.mediaTemplateMap.set(MediaType.MusicRelease, settings.musicReleaseTemplate);
		this.mediaTemplateMap.set(MediaType.BoardGame, settings.boardgameTemplate);
		this.mediaTemplateMap.set(MediaType.Book, settings.bookTemplate);
	}

	updateFolders(settings: MediaDbPluginSettings): void {
		this.mediaFolderMap = new Map<MediaType, string>();
		this.mediaFolderMap.set(MediaType.Movie, settings.movieFolder);
		this.mediaFolderMap.set(MediaType.Series, settings.seriesFolder);
		this.mediaFolderMap.set(MediaType.Manga, settings.mangaFolder);
		this.mediaFolderMap.set(MediaType.Game, settings.gameFolder);
		this.mediaFolderMap.set(MediaType.Wiki, settings.wikiFolder);
		this.mediaFolderMap.set(MediaType.MusicRelease, settings.musicReleaseFolder);
		this.mediaFolderMap.set(MediaType.BoardGame, settings.boardgameFolder);
		this.mediaFolderMap.set(MediaType.Book, settings.bookFolder);
	}

	getFileName(mediaTypeModel: MediaTypeModel): string {
		// Ignore undefined tags since some search APIs do not return all properties in the model and produce clean file names even if errors occur
		return replaceTags(this.mediaFileNameTemplateMap.get(mediaTypeModel.getMediaType()), mediaTypeModel, true);
	}

	async getTemplate(mediaTypeModel: MediaTypeModel, app: App): Promise<string> {
		const templateFilePath = this.mediaTemplateMap.get(mediaTypeModel.getMediaType());

		if (!templateFilePath) {
			return '';
		}

		let templateFile = app.vault.getAbstractFileByPath(templateFilePath);

		// WARNING: This was previously selected by filename, but that could lead to collisions and unwanted effects.
		// This now falls back to the previous method if no file is found
		if (!templateFile || templateFile instanceof TFolder) {
			templateFile = app.vault
				.getFiles()
				.filter((f: TFile) => f.name === templateFilePath)
				.first();

			if (!templateFile) {
				return '';
			}
		}

		const template = await app.vault.cachedRead(templateFile as TFile);
		// console.log(template);
		return replaceTags(template, mediaTypeModel);
	}

	async getFolder(mediaTypeModel: MediaTypeModel, app: App): Promise<TFolder> {
		let folderPath = this.mediaFolderMap.get(mediaTypeModel.getMediaType());

		if (!folderPath) {
			folderPath = `/`;
		}
		// console.log(folderPath);

		if (!(await app.vault.adapter.exists(folderPath))) {
			await app.vault.createFolder(folderPath);
		}
		const folder: TAbstractFile = app.vault.getAbstractFileByPath(folderPath);

		if (!(folder instanceof TFolder)) {
			throw Error(`Expected ${folder} to be instance of TFolder`);
		}

		return folder;
	}

	/**
	 * Takes an object and a MediaType and turns the object into an instance of a MediaTypeModel corresponding to the MediaType passed in.
	 *
	 * @param obj
	 * @param mediaType
	 */
	createMediaTypeModelFromMediaType(obj: any, mediaType: MediaType): MediaTypeModel {
		if (mediaType === MediaType.Movie) {
			return new MovieModel(obj);
		} else if (mediaType === MediaType.Series) {
			return new SeriesModel(obj);
		} else if (mediaType === MediaType.Manga) {
			return new MangaModel(obj);
		} else if (mediaType === MediaType.Game) {
			return new GameModel(obj);
		} else if (mediaType === MediaType.Wiki) {
			return new WikiModel(obj);
		} else if (mediaType === MediaType.MusicRelease) {
			return new MusicReleaseModel(obj);
		} else if (mediaType === MediaType.BoardGame) {
			return new BoardGameModel(obj);
		} else if (mediaType === MediaType.Book) {
			return new BookModel(obj);
		}

		return undefined;
	}
}
