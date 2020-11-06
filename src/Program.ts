import PegInterface from './PegInterface';
import { EvaluableObject, LineObject } from './PegInterfaceDefinitions';
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
	
	constructor (parser) {
		if (!parser) throw Error('no');
		this.parser = parser;
	}

	public async loadModule(filename: string, loader: LoaderType): Promise<Scope> {
		return this.scope = await this.loadModuleInternal(filename, loader);
	}

	private async loadModuleInternal(filename: string, loader: LoaderType): Promise<Scope> {
		if (this.scopeMap.has(filename)) {
			return this.scopeMap.get(filename);
		}

		var {fileUri, code} = await loader(filename);

		var scope = new Scope(fileUri, null);
		var parsed = this.parser.parse(code);

		await this.feed(parsed, scope, loader);

		this.scopeMap.set(filename, scope);
		return scope;
	}

	public async feed(lines: LineObject[], scope: Scope=this.scope, loader) {
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