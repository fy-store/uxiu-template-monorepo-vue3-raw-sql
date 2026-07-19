export class Path {
	static getExt(filename: string): string {
		const i = filename.lastIndexOf('.')
		return i > 0 ? filename.slice(i) : ''
	}

	static getFilenameInfo(filename: string) {
		const segmentationIndex = filename.lastIndexOf('/')
		const nameWithExt = segmentationIndex >= 0 ? filename.slice(segmentationIndex + 1) : filename
		const extIndex = nameWithExt.lastIndexOf('.')
		return {
			name: extIndex >= 0 ? nameWithExt.slice(0, extIndex) : nameWithExt,
			ext: extIndex >= 0 ? nameWithExt.slice(extIndex) : ''
		}
	}
}
