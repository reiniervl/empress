import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { spawn, spawnSync, ChildProcess } from "child_process";

export enum ServantStatus {
	Running = "running",
	NotRunning = "not running",
	Starting = "starting",
	Stopping = "stopping",
}

export interface ILog {
	name: string;
	uri: vscode.Uri;
}

export class Servant {
	private readonly servantDir: string;

	private _onDidChangeServant: vscode.EventEmitter<Servant | string> = new vscode.EventEmitter<Servant | string>();
	readonly onDidChangeServant: vscode.Event<Servant | string> = this._onDidChangeServant.event;

	private change(): void {
		this._onDidChangeServant.fire();
	}

	public start(): ChildProcess {
		let info = vscode.window.setStatusBarMessage(`Starting server: ${this.name}`);
		return spawn(ServantModel.serverCmd, ['start', this.name])
			.on('error', (n) => console.error(`error string server ${this.name} with message: ${n}`))
			.on('message', (n) => console.log(`message: ${n}`))
			.on('exit', () => { info.dispose(); this.change(); });
	}

	public stop(): ChildProcess {
		let info = vscode.window.setStatusBarMessage(`Stopping server: ${this.name}`);
		return spawn(ServantModel.serverCmd, ['stop', this.name])
			.on('error', (n) => console.error(`error string server ${this.name} with message: ${n}`))
			.on('message', (n) => console.log(`message: ${n}`))
			.on('exit', () => { info.dispose(); this.change(); });
	}

	public restart() {
		this.stop().on('exit', () => { this.change(), this.start(); } );
	}

	public get status(): ServantStatus {
		return spawnSync(ServantModel.serverCmd, ['status', this.name]).status === 0
			? ServantStatus.Running
			: ServantStatus.NotRunning;
	}

	public get logs(): ILog[] {
		let logDir = path.resolve(this.servantDir, 'logs');
		var logs: ILog[] = [];
		for(var f of fs.readdirSync(logDir, {withFileTypes: true})) {
			if(f.isFile && f.name === 'console.log' || f.name === 'messages.log') {
				logs.push({ name: f.name, uri: vscode.Uri.parse('file://' + path.resolve(logDir, f.name)) });
			}
		}
		return logs;
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

export class ServantProvider implements vscode.TreeDataProvider<Servant | ILog> {
	private model: ServantModel;

	private _onDidChangeTreeData: vscode.EventEmitter<Servant | ILog> = new vscode.EventEmitter<Servant | ILog>();
	readonly onDidChangeTreeData: vscode.Event<Servant | ILog> = this._onDidChangeTreeData.event;

	public getTreeItem(element: Servant | ILog): vscode.TreeItem {
		if(element instanceof Servant) {
			return {
				label: element.name,
				collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
				contextValue: element.status === ServantStatus.Running ? 'running' : 'notrunning',
				iconPath: element.status === ServantStatus.Running 
					? {
						dark: path.join(__filename, '../','../','media/','dark/','server-started.svg'),
						light: path.join(__filename, '../','../','media/','light/','server-started.svg')
					} 
					:{
						dark: path.join(__filename, '../','../','media/','dark/','server.svg'),
						light: path.join(__filename, '../','../','media/','light/','server.svg')
					}
			};
		} else {
			return {
				label: element.name,
				contextValue: 'log',
				command: {
					command: 'empress.openFile',
					arguments: [element.uri],
					title: 'open'
				},
				collapsibleState: vscode.TreeItemCollapsibleState.None
			};
		}
	}

	public getChildren(element?: Servant | ILog | undefined): vscode.ProviderResult<Servant[] | ILog[]> {
		return element 
			? element instanceof Servant 
				? element.logs
				: [] 
			: this.model.roots;
	}

	constructor(public readonly uri: string) {
		this.model = new ServantModel(this.uri);
		vscode.commands.registerCommand('empress.refresh', () => this._onDidChangeTreeData.fire());
		this.model.onDidChangeModel((e) => this._onDidChangeTreeData.fire());
		
		vscode.commands.registerCommand('empress.start', (servant: Servant) => servant.start());
		vscode.commands.registerCommand('empress.stop', (servant: Servant) => servant.stop());
		vscode.commands.registerCommand('empress.restart', (servant: Servant) => servant.restart());
		vscode.commands.registerCommand('empress.openFile', (file) => vscode.window.showTextDocument(file) );
	}
}