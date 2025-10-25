import type MediaDbPlugin from '../main';
import { SelectModal } from './SelectModal';

export interface SeasonSelectModalElement {
	season_number: number;
	name: string;
	air_date?: string;
	poster_path?: string;
}

export class MediaDbSeasonSelectModal extends SelectModal<SeasonSelectModalElement> {
	plugin: MediaDbPlugin;
	submitCallback?: (selectedSeasons: SeasonSelectModalElement[]) => void;
	closeCallback?: (err?: Error) => void;

	constructor(plugin: MediaDbPlugin, seasons: SeasonSelectModalElement[], multiSelect = true) {
		super(plugin.app, seasons, multiSelect);
		this.plugin = plugin;
		this.title = 'Select Season(s)';
		this.description = 'Select one or more seasons to create notes for.';
	}

	renderElement(season: SeasonSelectModalElement, el: HTMLElement): void {
		el.createEl('div', { text: `${season.name}` });
		if (season.air_date) {
			el.createEl('small', { text: `Air date: ${season.air_date}` });
		}
	}

	submit(): void {
		const selected = this.selectModalElements.filter(x => x.isActive()).map(x => x.value);
		this.submitCallback?.(selected);
		this.close();
	}

	skip(): void {
		this.close();
	}

	setSubmitCallback(cb: (selectedSeasons: SeasonSelectModalElement[]) => void): void {
		this.submitCallback = cb;
	}

	setCloseCallback(cb: (err?: Error) => void): void {
		this.closeCallback = cb;
	}
}
