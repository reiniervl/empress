import * as vscode from 'vscode';
import { ServantProvider } from './servants';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { LogView } from './logview';

function setEmpressView() {
	let configuration = vscode.workspace.getConfiguration('empress');
	let baseDir:string | undefined = configuration.get('openlibertyBaseDirectory');
	if(baseDir !== undefined && baseDir !== '') {
		if(existsSync(resolve(baseDir, './bin'))) {
			vscode.window.registerTreeDataProvider("empressView", new ServantProvider(baseDir));
		} else {
			vscode.window.showInformationMessage(`Could not find a Liberty installation at: ${baseDir}`);
		}
	} else {
		vscode.window.showInformationMessage('Please set the value "openlibertyBaseDirectory" for the Empress extension to work');
	}
}

export function activate(context: vscode.ExtensionContext) {
	let conf = vscode.workspace.onDidChangeConfiguration((e) => {
		if(e.affectsConfiguration('empress.openlibertyBaseDirectory')) {
			setEmpressView();
		}
	});
	setEmpressView();

	vscode.workspace.registerTextDocumentContentProvider("log", new LogView());
}

export function deactivate() {}
