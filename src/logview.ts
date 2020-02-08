import * as vscode from 'vscode';
import * as fs from 'fs';

export class LogView implements vscode.TextDocumentContentProvider {
	onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
	get onDidChange() { return this.onDidChangeEmitter.event; }

	watchList: vscode.Uri[] = [];

	provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
		if(!this.watchList.find((u,i) => u === uri)) {
			this.watchList.push(uri);
			fs.watchFile(uri.fsPath, () => this.onDidChangeEmitter.fire(uri));
		}
		return fs.readFileSync(uri.fsPath).toString();
	}
}