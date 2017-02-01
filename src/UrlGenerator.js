import URL from 'url'
import Path from 'path'

export class UrlGenerator {
	app = null
	req = null
	defaultUrl = null

	constructor(app, defaultUrl = null) {
		this.app = app

		if(defaultUrl.isNil) {
			let defaultUrl = null

			if(this.app.port === 443) {
				defaultUrl = 'https://localhost'
			} else if(this.app.port === 80) {
				defaultUrl = 'http://localhost'
			} else {
				defaultUrl = `http://localhost:${this.app.port}`
			}

			this.defaultUrl = URL.parse(app.config.get('app.url', defaultUrl))

			if(!this.defaultUrl.path.isNil && this.defaultUrl.path !== '' && this.defaultUrl.path !== '/') {
				throw new Error('`app.url` can not contain a path.')
			}
		} else {
			this.defaultUrl = defaultUrl
		}
	}

	/**
	 * Clone the instance to be used within a
	 * request cycle.
	 *
	 * @param object req
	 *
	 * @return object
	 */
	clone(req) {
		const cloned = new this.constructor(this.app, this.defaultUrl)
		cloned.req = req
		return cloned
	}

	/**
	 * Generate a URL for a route name and it’s parameters
	 *
	 * @param  {string} name Name of the route to generate
	 * @param  {Object|Array|string} parameters Parameter values for the route.
	 * @param  {Object|null} req Origin request to generate URL from, uses correct host/protocol
	 * @param  {boolean|null} secure Whether or not to force https, null uses default behavior
	 * @return {string}
	 */
	route(name, parameters, req, secure) {
		const route = this.app.routes.namedRoutes[name]

		if(route.isNil) {
			throw new Error(`Undefined route name: ${name}`)
		}

		if(!Array.isArray(parameters)) {
			parameters = [ parameters ]
		}

		const numberOfParameters = parameters.length
		let isObject = false

		if(numberOfParameters === 1 && typeof parameters[0] === 'object') {
			isObject = true
			parameters = parameters[0]
		}

		if(isObject) {
			parameters = { ...parameters }
		}

		let index = 0
		const path = route.path.replace(/:([a-z0-0_-]+)(?:\(([^)]+)\))?(\?)?/g, (_, name) => {
			if(isObject) {
				const value = parameters[name] || ''
				delete parameters[name]
				return value
			}

			if(numberOfParameters < index) {
				return ''
			}

			return parameters[index++] || ''
		})

		if(!isObject) {
			parameters = null
		}

		return this.make({
			pathname: path,
			query: { }
		}, parameters, req, secure)
	}

	/**
	 * Generate a URL
	 *
	 * @param  {string} url URL/Path to generate
	 * @param  {Object|Array|string} parameters Query string parameters
	 * @param  {Object|null} req Origin request to generate URL from, uses correct host/protocol
	 * @param  {boolean|null} secure Whether or not to force https, null uses default behavior
	 * @return {string}
	 */
	make(url, parameters, req, secure = null) {
		if(req === true || req === false) {
			secure = req
			req = null
		}

		if(req.isNil) {
			req = this.req
		}

		if(typeof url === 'string') {
			if(url.indexOf('://') > 0 || url.indexOf('//') === 0) {
				return url
			}

			if(url.indexOf('#') >= 0 || url.indexOf('?') >= 0) {
				url = URL.parse(url)
			} else {
				url = { pathname: url }
			}
		}

		if(!parameters.isNil) {
			if(url.query.isNil) {
				url.query = parameters
			} else {
				url.query = { ...url.query, ...parameters }
			}
		}

		url.pathname = Path.normalize(url.pathname || '').replace(/\/+$/, '')
		url.protocol = this.getProtocol(req, secure)
		url.host = this.getHost(req)

		return URL.format(url)
	}

	getProtocol(req = null, secure = null) {
		if(secure === true) {
			return 'https:'
		} else if(secure === false) {
			return 'http:'
		}

		if(req.isNil) {
			return this.defaultUrl.protocol || 'http:'
		}

		if(req.secure) {
			return 'https:'
		}

		return 'http:'
	}

	getHost(req = null) {
		if(req.isNil) {
			return this.defaultUrl.host || 'localhost'
		}

		return req.get('Host')
	}

}