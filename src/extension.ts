import { TextDecoder } from 'node:util';
import * as vscode from 'vscode';
import * as path from 'path';



export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('codequest-bytebuster.createCompetitionTemplate', async () => {
		const config = vscode.workspace.getConfiguration('codequest-bytebuster');
		const defaultCompetitionName = config.get<string>('defaultCompetitionName');
		const defaultLanguage = config.get<string>('defaultLanguage');
		const defaultCompetitionYear = config.get<string>('defaultCompetitionYear');
		const currentYear = new Date().getFullYear();
		const [startYear, endYear] = defaultCompetitionYear ? defaultCompetitionYear.split('-').map(Number) : [currentYear, currentYear + 1];
		const competitionName = defaultCompetitionName || await vscode.window.showInputBox({ prompt: 'Enter competition name' }) || "codequest";
		const language = (defaultLanguage || (await vscode.window.showInputBox({ prompt: 'Enter language' })) || "python").toLowerCase();
		const title = await vscode.window.showInputBox({ prompt: 'Enter title' });
		if (!title) {
			vscode.window.showErrorMessage('Title cannot be empty');
			return;
		}
		const year = `${startYear}-${endYear}`;
		if (!vscode.workspace.workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder found');
			return;
		}
		const folderPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, competitionName, year, language, title);
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(folderPath));
		vscode.window.showInformationMessage(`Competition template created at ${folderPath}`);

		// Check if the language is supported
		if (language !== 'java' && language !== 'python' && language !== 'cpp') {
			vscode.window.showErrorMessage('Unsupported language');
			return;
		}

		const inputFilePath = path.join(folderPath, '1.in');
		const outputFilePath = path.join(folderPath, '1.out');
		const sourceFilePath = path.join(folderPath, `main.${{
			java: 'java',
			python: 'py',
			cpp: 'cpp'
		}[language]}`);

		await Promise.all([
			vscode.workspace.fs.writeFile(vscode.Uri.file(inputFilePath), new Uint8Array),
			vscode.workspace.fs.writeFile(vscode.Uri.file(outputFilePath), new Uint8Array),
			vscode.workspace.fs.writeFile(vscode.Uri.file(sourceFilePath), new Uint8Array)
		]);

		const closeOtherWindowsWhenOpen = config.get<boolean>('closeOtherWindowsWhenOpen');
		const viewColumn = vscode.ViewColumn.One;
		if (closeOtherWindowsWhenOpen) {
			await vscode.commands.executeCommand('workbench.action.closeOtherEditors');
			const inputDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(inputFilePath));
			const outputDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(outputFilePath));
			const sourceDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(sourceFilePath));

			await Promise.all([
				vscode.window.showTextDocument(sourceDocument, viewColumn),
				vscode.window.showTextDocument(inputDocument, { viewColumn: viewColumn + 1, preserveFocus: true, preview: false }),
				vscode.window.showTextDocument(outputDocument, { viewColumn: viewColumn + 1, preserveFocus: true, preview: false })
			]);
		}

		config.update('defaultCompetitionName', competitionName, true);
		config.update('defaultLanguage', language, true);
		config.update('defaultCompetitionYear', year, true);
	});
	context.subscriptions.push(disposable);

let debugDisposable = vscode.commands.registerCommand('codequest-bytebuster.launchDebug', async () => {
		// Get the active text editor
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active text editor found');
			return;
		}

		// Get the file path of the active text editor
		const filePath = editor.document.uri.fsPath;

		// Get the directory path of the active text editor
		const dirPath = path.dirname(filePath);

		// Get the stem of the active text editor
		const stem = path.basename(filePath, path.extname(filePath));

		// Check if 1.in and 1.out files exist in the same directory with the same stem
		const inputFilePath = path.join(dirPath, '1.in');
		const outputFilePath = path.join(dirPath, '1.out');
		const inputExists = await vscode.workspace.fs.stat(vscode.Uri.file(inputFilePath)).then(() => true, () => false);
		const outputExists = await vscode.workspace.fs.stat(vscode.Uri.file(outputFilePath)).then(() => true, () => false);
		if (!inputExists || !outputExists) {
			vscode.window.showErrorMessage('1.in or 1.out file not found');
			return;
		}
		const programOutputFilePath = path.join(dirPath, 'program.out');
		if (await vscode.workspace.fs.stat(vscode.Uri.file(programOutputFilePath)).then(() => true, () => false)) {
			await vscode.workspace.fs.delete(vscode.Uri.file(programOutputFilePath));
		}

		// Run the file with corresponding commands based on the language
		const language = path.extname(filePath).substring(1);
		if (language === 'cpp') {
			const executableFilePath = path.join(dirPath, `${stem}.exe`);
			const { exec } = require('child_process');
			exec(`g++ -std=c++17 -Wall -Wextra -pedantic-errors -o "${executableFilePath}" "${filePath}" && cat "${inputFilePath}" | "${executableFilePath}" > "${programOutputFilePath}"`, (err: any) => {
				if (err) {
					vscode.window.showErrorMessage(`Compilation or execution error: ${err.message}`);
					return;
				}
				vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(programOutputFilePath), vscode.Uri.file(outputFilePath), 'Output Diff');
			});
		} else if (language === 'py') {
			const { exec } = require('child_process');
			exec(`cat "${inputFilePath}" | python "${filePath}" > "${programOutputFilePath}"`, (err: any) => {
				if (err) {
					vscode.window.showErrorMessage(`Execution error: ${err.message}`);
					return;
				}
				vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(programOutputFilePath), vscode.Uri.file(outputFilePath), 'Output Diff');
			});
		} else if (language === 'java') {
			const { exec } = require('child_process');
			exec(`javac "${filePath}" && cat "${inputFilePath}" | java -classpath "${dirPath}" "${stem}" > "${programOutputFilePath}"`, (err: any) => {
				if (err) {
					vscode.window.showErrorMessage(`Compilation or execution error: ${err.message}`);
					return;
				}
				vscode.commands.executeCommand('vscode.diff', vscode.Uri.file(programOutputFilePath), vscode.Uri.file(outputFilePath), 'Output Diff');
			});
		} else {
			vscode.window.showErrorMessage('Unsupported language');
			return;
		}

	});

	context.subscriptions.push(debugDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
