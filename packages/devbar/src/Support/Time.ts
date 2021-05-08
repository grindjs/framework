export const Time = {
	/**
	 * Alias for process.hrtime
	 */
	get: process.hrtime.bind(process),

	/**
	 * Converts hrtime tuple to microseconds
	 */
	flatten(time: [number, number]) {
		return time[0] * 1000000 + time[1] / 1000
	},

	/**
	 * Converts microseconds to milliseconds
	 */
	toMillis(time: number) {
		return Math.round(time) / 1000.0
	},
}
