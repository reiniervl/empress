import * as vscode from 'vscode';
import { ServantProvider } from './servants';

export function activate(context: vscode.ExtensionContext) {
	console.log('Empress is ruling your world');
	vscode.window.registerTreeDataProvider("empressView", new ServantProvider('/opt/liberty/wlp'));
}

export function deactivate() {}
