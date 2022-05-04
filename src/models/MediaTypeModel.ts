export abstract class MediaTypeModel {
	type: string;
	title: string;
	dataSource: string;
	id: string;

	abstract toMetaData(): string;
}
