import PegInterface from './PegInterface';
import { EvaluableObject, ImportOrLineObject } from './PegInterfaceDefinitions';
import ProofExplorer from './ProofExplorer';
import Scope from './Scope';

interface LoaderReturnType {
	fileUri?: string;
	code: string;
}

type LoaderType = (packageName: string) => (LoaderReturnType | Promise<LoaderReturnType>);

export default class Program {
	
	public scope: Scope;
	public readonly parser;
	public readonly scopeMap: Map<string, Scope> = new Map();

	/**
	 * A temporary list used by {@link loadModuleInternal} method.
	 * 
	 * This is the list of filenames of the files with a temporary mark during a
	 * depth-first topological sort. Node that the file is considered to be
	 * marked with a permanent mark if {@code this.scopeMap} has the filename.
	 * 
	 * See https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search.
	 */
	private loadingModules: string[];
	
	constructor (parser) {
		if (!parser) throw Error('no');
		this.parser = parser;
	}

	public async loadModule(filename: string, loader: LoaderType): Promise<Scope> {
		this.loadingModules = [];
		return this.scope = await this.loadModuleInternal(filename, loader);
	}

	private async loadModuleInternal(filename: string, loader: LoaderType): Promise<Scope> {
		// the file has a permanent mark
		if (this.scopeMap.has(filename)) {
			return this.scopeMap.get(filename);
		}

		var loadingModuleIndex = this.loadingModules.indexOf(filename);

		// the file has a temporary mark
		if (loadingModuleIndex >= 0) {
			if (loadingModuleIndex == this.loadingModules.length - 1) {
				throw Error(`Cannot self import (${filename})`);
			}

			var cycle = this.loadingModules.slice(loadingModuleIndex).concat(filename);

			throw Error(`Circular import detected (${cycle.join(' -> ')}). Sadly, circular import is currently not supported.`);
		}

		// mark the file with a temporary mark
		this.loadingModules.push(filename);

		var {fileUri, code} = await loader(filename);

		var scope = new Scope(fileUri, null);
		var parsed = this.parser.parse(code);

		await this.feed(parsed, scope, loader);

		// remove temporary mark
		if (this.loadingModules.pop() != filename) {
			throw Error('Something\'s wrong');
		}

		// mark the file with a permanent mark
		this.scopeMap.set(filename, scope);
		return scope;
	}

	public async feed(lines: ImportOrLineObject[], scope: Scope=this.scope, loader: LoaderType) {
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			
			switch (line._type) {
				case 'import':
					var scope2 = await this.loadModuleInternal(line.filename, loader);
					scope.importMap.set(line.filename, scope2);
					break;
				case 'typedef':
					var type = PegInterface.type(line, scope);

					if (scope.hasType(type.name)) {
						throw scope.error(`Type ${type.name} has already been declared`);
					}

					scope.addType(type);
					break;
				case 'defv':
					var variable = PegInterface.variable(line, scope);

					if (scope.hasVariable(variable.name)) {
						throw scope.error(`Definition ${variable.name} has already been declared`);
					}

					scope.addVariable(variable);
					break;
				case 'defun':
					var fun = PegInterface.fun(line, scope);

					if (scope.hasVariable(fun.name)) {
						throw scope.error(`Definition ${fun.name} has already been declared`);
					}

					scope.addFun(fun);
					break;
				case 'defschema':
					var schema = PegInterface.schema(line, scope, null);

					if (scope.hasSchema(schema.name)) {
						throw scope.error(`Schema ${schema.name} has already been declared`);
					}

					scope.addSchema(schema);
					break;
				default:
					throw Error(`Unknown line type ${(line as any)._type}`);
			}
		};
	}

	public evaluate(line: EvaluableObject) {
		var scope = new Scope('<repl>', this.scope);

		switch (line._type) {
			case 'typedef':
				return PegInterface.type(line, scope);
			case 'defv':
				return PegInterface.variable(line, scope);
			case 'defun':
				return PegInterface.fun(line, scope);
			case 'defschema':
			case 'schemaexpr':
				return PegInterface.schema(line, scope, null);
			case 'tee':
				return PegInterface.tee(line, scope, null);
			case 'reduction':
				return PegInterface.reduction(line, scope, null);
			case 'schemacall':
				return PegInterface.schemacall(line, scope, null);
			case 'var':
				return PegInterface.metavar(line, scope);
			default:
				throw Error(`Unknown line type ${(line as any)._type}`);
		}
	}

	public getProofExplorer(name: string, ktx) {
		return ProofExplorer.get(this.scope, name, ktx);
	}
}