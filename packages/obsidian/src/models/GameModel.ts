import { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { ModelToData } from 'packages/obsidian/src/utils/Utils';
import { mediaDbTag, migrateObject } from 'packages/obsidian/src/utils/Utils';

export type GameData = ModelToData<GameModel>;

export class GameModel extends MediaTypeModel {
	developers: string[];
	publishers: string[];
	genres: string[];
	onlineRating: number;
	image: string;

	released: boolean;
	releaseDate: string;

	userData: {
		played: boolean;
		personalRating: number;
	};

	constructor(obj: GameData) {
		super();

		this.developers = [];
		this.publishers = [];
		this.genres = [];
		this.onlineRating = 0;
		this.image = '';

		this.released = false;
		this.releaseDate = '';

		this.userData = {
			played: false,
			personalRating: 0,
		};

		migrateObject(this, obj, this);

		if (!Object.hasOwn(obj, 'userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'game'];
	}

	getMediaType(): MediaType {
		return MediaType.Game;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ')';
	}
}
