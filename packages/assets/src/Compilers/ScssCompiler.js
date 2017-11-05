import './Compiler'

import { MissingPackageError } from 'grind-framework'
import { FS } from 'grind-support'

const path = require('path')
const optional = require('optional')
const sass = optional('node-sass')

export class ScssCompiler extends Compiler {

	supportedExtensions = [ 'scss', 'sass' ]
	options = { }
	priority = 1000

	constructor(app, ...args) {
		super(app, ...args)

		this.options = app.config.get('assets.compilers.scss', { })

		if(this.options.sourceMap.isNil && this.options.sourceMapEmbed.isNil && this.options.sourceMapContents.isNil) {
			this.options.sourceMap = this.sourceMaps === 'auto'
			this.options.sourceMapEmbed = this.sourceMaps === 'auto'
			this.options.sourceMapContents = this.sourceMaps === 'auto'
		}
	}

	async compile(pathname, context) {
		if(sass.isNil) {
			return Promise.reject(new MissingPackageError('node-sass', 'dev'))
		}

		const imports = await this.getLiveReloadImports(pathname)

		return new Promise((resolve, reject) => {
			sass.render(Object.assign({ }, this.options, {
				file: pathname,
				outputStyle: context || 'nested'
			}), (err, result) => {
				if(!err.isNil) {
					return reject(err)
				}

				if(!this.liveReload || imports.length === 0) {
					return resolve(result.css)
				}

				let css = result.css.toString()

				if(imports.length > 0) {
					css += '\n#__liveReloadImports{background-image:'
					css += `url(${imports.join('),url(')})`
					css += '}'
				}

				resolve(css)
			})
		})
	}

	async enumerateImports(pathname, callback) {
		const exists = await FS.exists(pathname)

		if(!exists) {
			return
		}

		const contents = await FS.readFile(pathname)
		const importPaths = [ ]

		contents.toString().replace(/@import\s?([^\s]+);/ig, (_, importPath) => {
			importPaths.push(importPath)
		})

		for(let importPath of importPaths) {
			const dirname = path.dirname(pathname)
			importPath = importPath.replace(/("|'|url|\(|\))/g, '').trim()
			let partial = null

			if(importPath.indexOf('/') >= 0) {
				partial = path.join(dirname, path.dirname(importPath), `_${path.basename(importPath)}`)
			} else {
				partial = path.join(dirname, `_${importPath}`)
			}

			importPath = path.join(dirname, importPath)
			const ext = path.extname(importPath)
			const files = [ ]

			if(ext !== '.scss' && ext !== '.sass') {
				files.push(`${importPath}.scss`)
				files.push(`${partial}.scss`)
				files.push(`${importPath}.sass`)
				files.push(`${partial}.sass`)
			} else {
				files.push(importPath)
			}

			for(const file of files) {
				const exists = await FS.exists(file)

				if(!exists) {
					continue
				}

				await callback(file)
				break
			}
		}
	}

	mime() {
		return 'text/css'
	}

	type() {
		return 'css'
	}

	extension() {
		return 'css'
	}

}
