import { MarkdownView, Notice } from 'obsidian';
import type { TMDBSeasonAPI } from 'packages/obsidian/src/api/apis/TMDBSeasonAPI';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { SeasonSelectModalElement } from 'packages/obsidian/src/modals/MediaDbSeasonSelectModal';
import { MediaDbSeasonSelectModal } from 'packages/obsidian/src/modals/MediaDbSeasonSelectModal';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { SeasonModel } from 'packages/obsidian/src/models/SeasonModel';
import type { AppError } from 'packages/obsidian/src/utils/AppError';
import { AppErrorKind } from 'packages/obsidian/src/utils/AppError';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { SearchModalOptions } from 'packages/obsidian/src/utils/ModalHelper';

export class MediaDbEntryHelper {
	readonly plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	private reportAppError(error: AppError): void {
		this.plugin.errorReporter.report(error);
	}

	async createLinkWithSearchModal(): Promise<void> {
		const advancedSearch = await this.plugin.modalHelper.promptAdvancedSearchModal({});
		if (!advancedSearch) {
			return;
		}

		const apiSearchResults = await this.plugin.apiManager.query(advancedSearch.query, advancedSearch.apis);
		if (!apiSearchResults.ok) {
			this.reportAppError(apiSearchResults.error);
			return;
		}

		if (!apiSearchResults.value.items || apiSearchResults.value.items.length === 0) {
			this.reportAppError({ kind: AppErrorKind.Validation, message: 'No results found.', userMessage: 'No results found.' });
			return;
		}

		const selectResults = await this.plugin.modalHelper.promptSelectModal({ elements: apiSearchResults.value.items, multiSelect: false });
		if (!selectResults || selectResults.selected.length < 1) {
			return;
		}

		const detailedResults = await this.queryDetails(selectResults.selected);
		if (detailedResults.length < 1) {
			return;
		}

		const link = `[${detailedResults[0].title}](${detailedResults[0].url})`;
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);

		if (view) {
			view.editor.replaceRange(link, view.editor.getCursor());
		}
	}

	async createEntryWithSearchModal(searchModalOptions?: SearchModalOptions): Promise<void> {
		const searchData = await this.plugin.modalHelper.promptSearchModal(searchModalOptions ?? {});
		if (!searchData) {
			return;
		}

		const types = searchData.types;
		const apis = this.plugin.apiManager.apis.filter(api => api.hasTypeOverlap(types)).map(api => api.apiName);
		const apiSearchResults = await this.plugin.apiManager.query(searchData.query, apis);
		if (!apiSearchResults.ok) {
			this.reportAppError(apiSearchResults.error);
			return;
		}

		if (!apiSearchResults.value.items || apiSearchResults.value.items.length === 0) {
			this.reportAppError({ kind: AppErrorKind.Validation, message: 'No results found.', userMessage: 'No results found.' });
			return;
		}

		const filteredSearchResults = apiSearchResults.value.items.filter(result => types.includes(result.getMediaType()));
		if (filteredSearchResults.length === 0) {
			this.reportAppError({ kind: AppErrorKind.Validation, message: 'No results found for the selected types.', userMessage: 'No results found for the selected types.' });
			return;
		}

		const selectResultsData =
			types.length === 1 && types[0] === MediaType.Season
				? await this.plugin.modalHelper.promptSelectModal({
						elements: filteredSearchResults,
						description: 'Select one search result to proceed.',
						submitButtonText: 'Ok',
					})
				: await this.plugin.modalHelper.promptSelectModal({ elements: filteredSearchResults });

		if (!selectResultsData) {
			return;
		}

		const selectResults = types.length === 1 && types[0] === MediaType.Season ? selectResultsData.selected : await this.queryDetails(selectResultsData.selected);

		if (selectResults.length === 0) {
			return;
		}

		const seasonHandlingResult = await this.handleSeasonWorkflow(types, selectResults);
		if (seasonHandlingResult.handled) {
			return;
		}

		const confirmed = await this.plugin.modalHelper.promptPreviewModal({ elements: selectResults });
		if (!confirmed?.confirmed) {
			return;
		}

		await this.plugin.fileHelper.createMediaDbNotes(selectResults);
	}

	async createEntryWithAdvancedSearchModal(): Promise<void> {
		const advancedSearch = await this.plugin.modalHelper.promptAdvancedSearchModal({});
		if (!advancedSearch) {
			return;
		}

		const apiSearchResults = await this.plugin.apiManager.query(advancedSearch.query, advancedSearch.apis);
		if (!apiSearchResults.ok) {
			this.reportAppError(apiSearchResults.error);
			return;
		}

		if (!apiSearchResults.value.items || apiSearchResults.value.items.length === 0) {
			this.reportAppError({ kind: AppErrorKind.Validation, message: 'No results found.', userMessage: 'No results found.' });
			return;
		}

		const selectResultsData = await this.plugin.modalHelper.promptSelectModal({ elements: apiSearchResults.value.items });
		if (!selectResultsData) {
			return;
		}

		const selectResults = await this.queryDetails(selectResultsData.selected);
		if (selectResults.length < 1) {
			return;
		}

		const confirmed = await this.plugin.modalHelper.promptPreviewModal({ elements: selectResults });
		if (!confirmed?.confirmed) {
			return;
		}

		await this.plugin.fileHelper.createMediaDbNotes(selectResults);
	}

	async createEntryWithIdSearchModal(): Promise<void> {
		let idSearchResult: MediaTypeModel | undefined = undefined;
		let proceed = false;

		while (!proceed) {
			const idSearchData = await this.plugin.modalHelper.promptIdSearchModal({});
			if (!idSearchData) {
				return;
			}

			const queriedIdResult = await this.plugin.apiManager.queryDetailedInfoById(idSearchData.query, idSearchData.api);
			if (!queriedIdResult.ok) {
				this.reportAppError(queriedIdResult.error);
				return;
			}

			idSearchResult = queriedIdResult.value;
			if (!idSearchResult) {
				return;
			}

			const previewData = await this.plugin.modalHelper.promptPreviewModal({ elements: [idSearchResult] });
			if (!previewData) {
				return;
			}

			proceed = previewData.confirmed;
		}

		if (!idSearchResult) {
			return;
		}

		const createNoteResult = await this.plugin.fileHelper.createMediaDbNoteFromModel(idSearchResult, { attachTemplate: true, openNote: true });
		if (!createNoteResult.ok) {
			this.reportAppError(createNoteResult.error);
		}
	}

	async queryDetails(models: MediaTypeModel[]): Promise<MediaTypeModel[]> {
		const results = await Promise.all(models.map(model => this.plugin.apiManager.queryDetailedInfo(model)));

		const detailModels: MediaTypeModel[] = [];
		for (const result of results) {
			if (result.ok && result.value) {
				detailModels.push(result.value);
			} else if (!result.ok) {
				this.reportAppError(result.error);
			}
		}

		return detailModels;
	}

	private async handleSeasonWorkflow(types: string[], selectResults: MediaTypeModel[]): Promise<{ handled: boolean; seasonsCreated?: boolean }> {
		if (types.length === 1 && types[0] === 'season' && selectResults.length === 1 && selectResults[0].dataSource === 'TMDBSeasonAPI') {
			const created = await this.showSeasonSelectAndCreate(selectResults[0].id, selectResults[0].englishTitle || selectResults[0].title);
			return { handled: true, seasonsCreated: created };
		}

		if (types.includes('series') && selectResults.some(result => result.dataSource === 'TMDBSeriesAPI')) {
			const seriesResults = selectResults.filter(result => result.dataSource === 'TMDBSeriesAPI');
			if (seriesResults.length === 1 && types.includes('season')) {
				const created = await this.showSeasonSelectAndCreate(seriesResults[0].id, seriesResults[0].title);
				return { handled: true, seasonsCreated: created };
			}
		}

		return { handled: false };
	}

	private async showSeasonSelectAndCreate(seriesId: string, seriesTitle: string): Promise<boolean> {
		const tmdbSeasonAPI = this.plugin.apiManager.getApiByName('TMDBSeasonAPI') as TMDBSeasonAPI | undefined;
		if (!tmdbSeasonAPI) {
			new Notice('TMDBSeasonAPI not available.');
			return false;
		}

		const allSeasonsResult = await tmdbSeasonAPI.getSeasonsForSeries(seriesId);
		if (!allSeasonsResult.ok) {
			this.reportAppError(allSeasonsResult.error);
			new Notice(`Error loading seasons: ${allSeasonsResult.error.userMessage}`);
			return false;
		}

		const allSeasons = allSeasonsResult.value;
		if (allSeasons.length === 0) {
			new Notice('No seasons found for this series.');
			return false;
		}

		const selectedSeasons = await this.showSeasonSelectModal(allSeasons, seriesTitle);
		if (!selectedSeasons || selectedSeasons.length === 0) {
			return false;
		}

		await this.createNotesForSelectedSeasons(selectedSeasons, allSeasons, tmdbSeasonAPI);
		new Notice(`Successfully created ${selectedSeasons.length} season ${selectedSeasons.length === 1 ? 'entry' : 'entries'}.`);
		return true;
	}

	private async showSeasonSelectModal(allSeasons: SeasonModel[], seriesTitle: string): Promise<SeasonSelectModalElement[] | undefined> {
		const modal = new MediaDbSeasonSelectModal(
			this.plugin,
			allSeasons.map(season => ({
				season_number: season.seasonNumber,
				name: season.seasonTitle || season.title,
				episode_count: season.episodes || 0,
				air_date: season.year,
				poster_path: season.image,
			})),
			true,
			seriesTitle,
		);

		return await new Promise(resolve => {
			modal.setSubmitCb(resolve);
			modal.open();
		});
	}

	private async createNotesForSelectedSeasons(selectedSeasons: SeasonSelectModalElement[], allSeasons: SeasonModel[], tmdbSeasonAPI: TMDBSeasonAPI): Promise<void> {
		await Promise.all(
			selectedSeasons.map(async selectedSeason => {
				const seasonModel = allSeasons.find(season => season.seasonNumber === selectedSeason.season_number);
				if (seasonModel) {
					const fullMetadataResult = await tmdbSeasonAPI.getById(seasonModel.id);
					if (!fullMetadataResult.ok) {
						this.reportAppError(fullMetadataResult.error);
						new Notice(`Failed to load season ${selectedSeason.season_number}: ${fullMetadataResult.error.userMessage}`);
						return;
					}

					await this.plugin.fileHelper.createMediaDbNotes([fullMetadataResult.value]);
				}
			}),
		);
	}
}
