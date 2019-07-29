import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { execSync, exec } from "child_process";

export enum ServantStatus {
	Running,
	NotRunning
}

export class Servant {
	public start() {
		let cmd = new vscode.ShellExecution(path.resolve(ServantModel.serverLocation, './bin/server'), ['start', this.name]);
		exec(cmd.command.toString()).addListener("message", (m) => console.log(m));
	}

	public stop() {
		let cmd = new vscode.ShellExecution(path.resolve(ServantModel.serverLocation, './bin/server'), ['stop', this.name]);
		exec(cmd.command.toString()).addListener("message", (m) => console.log(m));
	}

	public get status(): ServantStatus {
		let cmd = new vscode.ShellExecution(path.resolve(ServantModel.serverLocation, './bin/server'), ['status', this.name]);
		var result = execSync(cmd.command.toString(), {encoding: "utf8"});
		return result.endsWith('not running') ? ServantStatus.NotRunning : ServantStatus.Running;
	}

	constructor(public readonly name: string) {	}
}

export class ServantModel {
	public static serverLocation = '';
	private listServants(): string[] {
		let serversPath = path.resolve(this.serverLocation, './usr/servers');
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
		return this.listServants().map((s) => new Servant(s));
	}

	constructor(public readonly serverLocation: string) {
		ServantModel.serverLocation = serverLocation;
	}
}

export class ServantProvider implements vscode.TreeDataProvider<Servant> {
	private model: ServantModel;

	public getTreeItem(element: Servant): vscode.TreeItem {
		return {
			label: element.name,
			collapsibleState: vscode.TreeItemCollapsibleState.None
		};
	}

	public getChildren(element?: Servant): vscode.ProviderResult<Servant[]> {
		return element ? [] : this.model.roots;
	}

	constructor(public readonly uri: string) {
		this.model = new ServantModel(this.uri);
	}
}