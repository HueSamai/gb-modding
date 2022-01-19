// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs'
import { SidebarProvider } from "./SidebarProvider";

function getProjectPath() 
{
	let path = vscode.workspace.workspaceFolders[0].uri.path;
	let finalPath = path.substring(1);
	return finalPath;
}

function projectExists() 
{
	let files = fs.readdirSync(getProjectPath());
	
	let exists = false;
	for (const file of files) 
	{
		if (file.split('.').pop() == "csproj") 
		{
			exists = true;
			break;
		}
	}

	return exists;
}

export function activate(context: vscode.ExtensionContext) {
	const provider = new SidebarProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, provider)
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
