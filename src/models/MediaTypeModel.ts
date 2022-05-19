export abstract class MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	abstract toMetaData(): string;

	abstract getFileName(): string;

	abstract getTags(): string[];

}
