export const wrapAround = (value: number, size: number): number => {
	return ((value % size) + size) % size;
};

export const sleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};
