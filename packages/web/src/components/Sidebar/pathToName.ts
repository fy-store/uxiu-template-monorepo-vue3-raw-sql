export default (path?: string) => {
	if (!path) return
	if (path.startsWith('/')) {
		return path.slice(1)
	}
	return path
}
