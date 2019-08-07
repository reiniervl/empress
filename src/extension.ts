import * as vscode from 'vscode';
import { ServantProvider } from './servants';
import { resolve } from 'path';
import { existsSync } from 'fs';

export function activate(context: vscode.ExtensionContext) {
	console.log('Empress is ruling your world');
	let configuration = vscode.workspace.getConfiguration('empress');
	if(configuration.has('openlibertyBaseDirectory')) {
		let baseDir:string | undefined = configuration.get('openlibertyBaseDirectory');
		if(baseDir !== undefined && existsSync(resolve(baseDir, './bin'))) {
			vscode.window.registerTreeDataProvider("empressView", new ServantProvider(baseDir));
		}
	} else {
		vscode.window.showInformationMessage('Please set the value "openlibertyBaseDirectory" for the Empress extension to work');
	}
}

export function deactivate() {}
