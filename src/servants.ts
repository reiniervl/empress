import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { spawn, spawnSync } from "child_process";

export enum ServantStatus {
	Running = "running",
	NotRunning = "not running",
	Starting = "starting",
	Stopping = "stopping",
}

export class Servant {
	private readonly servantDir: string;

	private _onDidChangeServant: vscode.EventEmitter<Servant | string> = new vscode.EventEmitter<Servant | string>();
	readonly onDidChangeServant: vscode.Event<Servant | string> = this._onDidChangeServant.event;

	private change(): void {
		this._onDidChangeServant.fire();
	}

	public start() {
		let info = vscode.window.setStatusBarMessage(`Starting server: ${this.name}`);
		spawn(ServantModel.serverCmd, ['start', this.name])
			.on('error', (n) => console.error(`error string server ${this.name} with message: ${n}`))
			.on('message', (n) => console.log(`message: ${n}`))
			.on('exit', () => info.dispose());
	}

	public stop() {
		let info = vscode.window.setStatusBarMessage(`Stopping server: ${this.name}`);
		spawn(ServantModel.serverCmd, ['stop', this.name])
			.on('error', (n) => console.error(`error string server ${this.name} with message: ${n}`))
			.on('message', (n) => console.log(`message: ${n}`))
			.on('exit', () => info.dispose());
	}

	public get status(): ServantStatus {
		return spawnSync(ServantModel.serverCmd, ['status', this.name]).status === 0
			? ServantStatus.Running
			: ServantStatus.NotRunning;
	}

	constructor(public readonly name: string) {
		this.servantDir = path.resolve(ServantModel.libertyBase, './usr/servers', name);
		fs.watchFile(path.resolve(this.servantDir, './workarea/.sCommand'),() => this.change());
	}
}

export class ServantModel {
	public static libertyBase: string;	
	public static javaCmd: string;
	public static serverCmd: string;

	private _onDidChangeModel: vscode.EventEmitter<Servant | string> = new vscode.EventEmitter<Servant | string>();
	readonly onDidChangeModel: vscode.Event<Servant | string> = this._onDidChangeModel.event;

	private change(): void {
		this._onDidChangeModel.fire();
	}


	private listServants(): string[] {
		let serversPath = path.resolve(this.serverDir, './usr/servers');
		var servants: string[] = [];
		if(fs.existsSync(serversPath)) {
			for(var d of fs.readdirSync(serversPath, {withFileTypes: true})) {
				if(d.isDirectory && fs.existsSync(path.resolve(serversPath, d.name, './server.xml'))) {
					servants.push(d.name);
				}
			}
		}
		return servants;
	}

	public get roots(): Servant[] {
		return this.listServants().map((s) => {
			let servant = new Servant(s);
			servant.onDidChangeServant((e) => this.change());
			return servant;
		}
			);
	}

	constructor(public readonly serverDir: string) {
		ServantModel.libertyBase = serverDir;
		if(process.platform === 'win32') {
			ServantModel.serverCmd = path.resolve(serverDir, './bin/server.bat');
		} else {
			ServantModel.serverCmd = path.resolve(serverDir, './bin/server');
		}
	}
}

export class ServantProvider implements vscode.TreeDataProvider<Servant | string> {
	private model: ServantModel;

	private _onDidChangeTreeData: vscode.EventEmitter<Servant | string> = new vscode.EventEmitter<Servant | string>();
	readonly onDidChangeTreeData: vscode.Event<Servant | string> = this._onDidChangeTreeData.event;

	public getTreeItem(element: Servant | string): vscode.TreeItem {
		if(element instanceof Servant) {
			return {
				label: element.name,
				collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
				contextValue: element.status === ServantStatus.Running ? 'running' : 'notrunning',
				iconPath: vscode.ThemeIcon.Folder,
			};
		} else {
			return {
				label: element,
				collapsibleState: vscode.TreeItemCollapsibleState.None
			};
		}
	}

	public getChildren(element?: Servant | string | undefined): vscode.ProviderResult<Servant[] | string[]> {
		return element 
			? element instanceof Servant 
				? ["status: " + element.status] 
				: [] 
			: this.model.roots;
	}

	constructor(public readonly uri: string) {
		this.model = new ServantModel(this.uri);
		vscode.commands.registerCommand('empress.refresh', () => this._onDidChangeTreeData.fire());
		this.model.onDidChangeModel((e) => this._onDidChangeTreeData.fire());
		
		vscode.commands.registerCommand('empress.start', (servant: Servant) => servant.start());
		vscode.commands.registerCommand('empress.stop', (servant: Servant) => servant.stop());
	}
}