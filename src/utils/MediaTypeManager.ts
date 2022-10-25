import { MediaDbPluginSettings } from '../settings/Settings';
import { MediaType } from './MediaType';
import { MediaTypeModel } from '../models/MediaTypeModel';
import { replaceTags } from './Utils';
import { App, TFile } from 'obsidian';
import { MovieModel } from '../models/MovieModel';
import { SeriesModel } from '../models/SeriesModel';
import { GameModel } from '../models/GameModel';
import { WikiModel } from '../models/WikiModel';
import { MusicReleaseModel } from '../models/MusicReleaseModel';
import { BoardGameModel } from '../models/BoardGameModel';

export const MEDIA_TYPES: MediaType[] = [MediaType.Movie, MediaType.Series, MediaType.Game, MediaType.Wiki, MediaType.MusicRelease, MediaType.BoardGame];

export class MediaTypeManager {
	mediaFileNameTemplateMap: Map<MediaType, string>;
	mediaTemplateMap: Map<MediaType, string>;

	constructor() {}

	updateTemplates(settings: MediaDbPluginSettings) {
		this.mediaFileNameTemplateMap = new Map<MediaType, string>();
		this.mediaFileNameTemplateMap.set(MediaType.Movie, settings.movieFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Series, settings.seriesFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Game, settings.gameFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Wiki, settings.wikiFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.MusicRelease, settings.musicReleaseFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.BoardGame, settings.boardgameFileNameTemplate);

		this.mediaTemplateMap = new Map<MediaType, string>();
		this.mediaTemplateMap.set(MediaType.Movie, settings.movieTemplate);
		this.mediaTemplateMap.set(MediaType.Series, settings.seriesTemplate);
		this.mediaTemplateMap.set(MediaType.Game, settings.gameTemplate);
		this.mediaTemplateMap.set(MediaType.Wiki, settings.wikiTemplate);
		this.mediaTemplateMap.set(MediaType.MusicRelease, settings.musicReleaseTemplate);
		this.mediaTemplateMap.set(MediaType.BoardGame, settings.boardgameTemplate);
	}

	getFileName(mediaTypeModel: MediaTypeModel): string {
		return replaceTags(this.mediaFileNameTemplateMap.get(mediaTypeModel.getMediaType()), mediaTypeModel);
	}

	async getTemplate(mediaTypeModel: MediaTypeModel, app: App) {
		const templateFileName = this.mediaTemplateMap.get(mediaTypeModel.getMediaType());

		if (!templateFileName) {
			return '';
		}

		const templateFile: TFile = app.vault
			.getFiles()
			.filter((f: TFile) => f.name === templateFileName)
			.first();

		if (!templateFile) {
			return '';
		}

		const template = await app.vault.cachedRead(templateFile);
		// console.log(template);
		return replaceTags(template, mediaTypeModel);
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
		} else if (mediaType === MediaType.Game) {
			return new GameModel(obj);
		} else if (mediaType === MediaType.Wiki) {
			return new WikiModel(obj);
		} else if (mediaType === MediaType.MusicRelease) {
			return new MusicReleaseModel(obj);
		} else if (mediaType === MediaType.BoardGame) {
			return new BoardGameModel(obj);
		}

		return undefined;
	}
}
