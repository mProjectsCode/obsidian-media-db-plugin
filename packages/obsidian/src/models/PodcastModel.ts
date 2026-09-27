import { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { ModelToData } from 'packages/obsidian/src/utils/Utils';
import { mediaDbTag, migrateObject } from 'packages/obsidian/src/utils/Utils';


export type PodcastData = ModelToData<PodcastModel>; 

export class PodcastModel extends MediaTypeModel {
    genres: string[];
    studio: string;
    cast?: string[];
    image?: string;
    rss: string;
    appleid?: string;
    spotifyid?: string;
    description?: string;


    released: boolean;

    userData: {
        played: boolean;
        personalRating: number;
    };

    constructor(obj: PodcastData) {
        super();

        this.genres = [];
        this.studio = ''; 
        this.cast = [];
        this.image = '';
        this.rss = '';
        this.appleid = '';
        this.spotifyid = '';
        this.description = '';

        this.released = false;

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
        return [mediaDbTag, 'podcast'];
    }

    getMediaType(): MediaType {
        return MediaType.Podcast;
    }

    getSummary(): string {
        return this.englishTitle + ' (' + this.year + ')';
    }
}
