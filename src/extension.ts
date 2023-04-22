// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('codequest-bytebuster.createCompetitionTemplate', async () => {
		const config = vscode.workspace.getConfiguration('codequest-bytebuster');
		const defaultCompetitionName = config.get<string>('defaultCompetitionName');
		const defaultLanguage = config.get<string>('defaultLanguage');
		const defaultCompetitionYear = config.get<string>('defaultCompetitionYear');
		const currentYear = new Date().getFullYear();
		const [startYear, endYear] = defaultCompetitionYear ? defaultCompetitionYear.split('-').map(Number) : [currentYear, currentYear + 1];
		const competitionName = defaultCompetitionName || await vscode.window.showInputBox({ prompt: 'Enter competition name' });
		const language = (defaultLanguage || (await vscode.window.showInputBox({ prompt: 'Enter language' })) || "python").toLowerCase();
		const title = await vscode.window.showInputBox({ prompt: 'Enter title' });
		const year = `${startYear}-${endYear}`;
		if (!vscode.workspace.workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder found');
			return;
		}
		const folderPath = `${vscode.workspace.workspaceFolders[0].uri.fsPath}\\${competitionName}\\${year}\\${language}\\${title}`;
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(folderPath));
		vscode.window.showInformationMessage(`Competition template created at ${folderPath}`);

		// Check if the language is supported
		if (language !== 'java' && language !== 'python' && language !== 'cpp') {
			vscode.window.showErrorMessage('Unsupported language');
			return;
		}

		const inputFilePath = `${folderPath}\\1.in`;
		const outputFilePath = `${folderPath}\\1.out`;
		const sourceFilePath = `${folderPath}\\main.${language}`;
		await Promise.all([
			vscode.workspace.fs.writeFile(vscode.Uri.file(inputFilePath), new Uint8Array),
			vscode.workspace.fs.writeFile(vscode.Uri.file(outputFilePath), new Uint8Array),
			vscode.workspace.fs.writeFile(vscode.Uri.file(sourceFilePath), new Uint8Array)
		]);

		const closeOtherWindowsWhenOpen = config.get<boolean>('closeOtherWindowsWhenOpen');
		const viewColumn = vscode.ViewColumn.One;
		if (closeOtherWindowsWhenOpen) {
			await vscode.commands.executeCommand('workbench.action.closeOtherEditors');
		}

		const inputDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(inputFilePath));
		const outputDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(outputFilePath));
		const sourceDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(sourceFilePath));
await Promise.all([
			vscode.window.showTextDocument(sourceDocument, viewColumn),
			vscode.window.showTextDocument(inputDocument, { viewColumn: viewColumn + 1, preserveFocus: true, preview: false }),
			vscode.window.showTextDocument(outputDocument, { viewColumn: viewColumn + 1, preserveFocus: true, preview: false })
		]);


		config.update('defaultCompetitionName', competitionName, true);
		config.update('defaultLanguage', language, true);
		config.update('defaultCompetitionYear', year, true);
	});
	context.subscriptions.push(disposable);

}

// This method is called when your extension is deactivated
export function deactivate() { }
