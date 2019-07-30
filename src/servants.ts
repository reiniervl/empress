import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { exec, execSync } from "child_process";

export enum ServantStatus {
	Running = "Running",
	NotRunning = "Not Running",
	Unknown = "Unknown"
}

export class Servant {
	private readonly servantDir: string;
	private readonly pidDir: string;
	private readonly pidFile: string;
	private readonly javaCmd = `java -javaagent:${path.resolve(ServantModel.serverLocation, 'bin/tools/ws-javaagent.jar')} -jar ${path.resolve(ServantModel.serverLocation, 'bin/tools/ws-server.jar')}`;

	
	public start() {
		let cmd = `${this.javaCmd} --start ${this.name}`;
		exec(cmd).addListener("message", (m) => console.log(m));
	}

	public stop() {
		let cmd = `${this.javaCmd} --stop ${this.name}`;
		exec(cmd).addListener("message", (m) => console.log(m));
	}

	public get status(): ServantStatus {
		if(fs.existsSync(path.resolve(this.servantDir, './workarea/.sLock'))) {
			if(!fs.existsSync(path.resolve(this.servantDir, './workarea/.sCommand'))) {
				return ServantStatus.NotRunning;
			}

			if(fs.existsSync(this.pidFile)) {
				let pid = execSync(`cat ${this.pidFile}`, {encoding: "utf8"}).trim();
				let running = execSync(`if ps -p ${pid} > /dev/null 2>&1; then echo true; fi`, {encoding: "utf8"});
				
				if(running) {
					return ServantStatus.Running;
				}
			}

			if(execSync(`${this.javaCmd} ${this.name} --status > /dev/null; echo $?`, {encoding : "utf8"}) !== '0') {
				exec(`rm -f ${path.resolve(this.servantDir, './workarea/.sCommand')}`);
				return ServantStatus.NotRunning;
			} else {
				return ServantStatus.Running;
			}
		}
		return ServantStatus.Unknown;
	}

	constructor(public readonly name: string) {
		this.servantDir = path.resolve(ServantModel.serverLocation, './usr/servers', name);
		this.pidDir = path.resolve(ServantModel.serverLocation, './usr/servers/.pid');
		this.pidFile = path.resolve(this.pidDir, `${name}.pid`);
	}
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

export class ServantProvider implements vscode.TreeDataProvider<Servant | string> {
	private model: ServantModel;

	public getTreeItem(element: Servant | string): vscode.TreeItem {
		if(element instanceof Servant) {
			return {
				label: element.name,
				collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
				contextValue: 'servant'
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
	}
}