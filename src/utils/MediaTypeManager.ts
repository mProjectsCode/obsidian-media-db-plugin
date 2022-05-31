import {MediaDbPluginSettings} from '../settings/Settings';
import {MediaType} from './MediaType';
import {MediaTypeModel} from '../models/MediaTypeModel';
import {replaceTags} from './Utils';
import {App, TFile} from 'obsidian';
import {MovieModel} from '../models/MovieModel';
import {SeriesModel} from '../models/SeriesModel';
import {GameModel} from '../models/GameModel';
import {WikiModel} from '../models/WikiModel';
import {MusicReleaseModel} from '../models/MusicReleaseModel';

export class MediaTypeManager {
	mediaFileNameTemplateMap: Map<MediaType, string>;
	mediaTemplateMap: Map<MediaType, string>;

	constructor(settings: MediaDbPluginSettings) {
		this.updateTemplates(settings);
	}

	updateTemplates(settings: MediaDbPluginSettings) {
		this.mediaFileNameTemplateMap = new Map<MediaType, string>();
		this.mediaFileNameTemplateMap.set(MediaType.Movie, settings.movieFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Series, settings.seriesFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Game, settings.gameFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.Wiki, settings.wikiFileNameTemplate);
		this.mediaFileNameTemplateMap.set(MediaType.MusicRelease, settings.musicReleaseFileNameTemplate);

		this.mediaTemplateMap = new Map<MediaType, string>();
		this.mediaTemplateMap.set(MediaType.Movie, settings.movieTemplate);
		this.mediaTemplateMap.set(MediaType.Series, settings.seriesTemplate);
		this.mediaTemplateMap.set(MediaType.Game, settings.gameTemplate);
		this.mediaTemplateMap.set(MediaType.Wiki, settings.wikiTemplate);
		this.mediaTemplateMap.set(MediaType.MusicRelease, settings.musicReleaseTemplate);
	}

	getFileName(mediaTypeModel: MediaTypeModel): string {
		return replaceTags(this.mediaFileNameTemplateMap.get(mediaTypeModel.getMediaType()), mediaTypeModel);
	}

	async getContent(mediaTypeModel: MediaTypeModel, app: App) {
		const templateFileName = this.mediaTemplateMap.get(mediaTypeModel.getMediaType());

		if (!templateFileName) {
			return '';
		}

		const templateFile: TFile = app.vault.getFiles().filter((f: TFile) => f.name === templateFileName).first();

		if (!templateFile) {
			return '';
		}

		const template = await app.vault.cachedRead(templateFile);
		// console.log(template);
		return replaceTags(template, mediaTypeModel);
	}

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
		}

		return undefined;
	}
}
