// 169.245.223.229 = your ip

// Ok sorry for this terrible mess of code
// It at least works
// If you know javascript please stay away before your eyes bleed
// This was my first time coding in typescript and actually coding something useful and good in javascript
// Also first extension
// Sorry that it's so bad...
// I'll stick to javascript in the future

import * as vscode from 'vscode';
import * as fs from 'fs'
import { SidebarProvider } from "./SidebarProvider";

let PROJECT_NAME = "";

function getGBFolder() {
	return String(vscode.workspace.getConfiguration().get("gangBeastsModding.gameDirectory"));
}

function getProjectPath() 
{
	let workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders == null) return;

	let path = workspaceFolders[0].uri.path;

	let finalPath = path.substring(1);
	return finalPath;
}

function projectExists(projectPath : string) 
{
	let files = fs.readdirSync(projectPath);
	
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

function getProjectName() {
	return PROJECT_NAME;
}

function isValidName(name : string) {
	// who actually knows how to use regexes like...stole from stackoverflow: https://stackoverflow.com/a/4434100
	const valid = /^[a-z]+$/i; 

	return valid.test(name);
}

function getDefaultProjectContents() {

	const contents =
`<Project Sdk="Microsoft.NET.Sdk">

  	<PropertyGroup>
    	<TargetFramework>netstandard2.0</TargetFramework>
  	</PropertyGroup>

  	<ItemGroup>
		<!--NewReference-->
  	</ItemGroup>

</Project>`;

	return contents;
}

function getDefaultFileContents() {
	const contents =
`using System;
using UnityEngine;

public class ` + getProjectName() + ` : Mod {

    // Called once when the mod is first loaded.
    public void Init() {

    }

    // Called once when all mods have been loaded.
    public void Start() {

    }

    // Called once every frame, in any scene
    public void Update() {

    }
}`;

	return contents;
}

// Sets the project name of your cs project not your project path which is different naming is hard
function setProjectName() {
	const projectPath = getProjectPath();
	if (projectPath == null) return;

	let files = fs.readdirSync(projectPath);
	
	for (const file of files) 
	{
		let fileSplit = file.split('.');
		if (fileSplit.pop() == "csproj") 
		{
			PROJECT_NAME = fileSplit.join('')
			return;
		}
	}
}

function addReferences(paths : string[]) {
	let firstPath = paths.pop();
	while (firstPath == null) {
		firstPath = paths.pop();
	}

	addReference(firstPath, paths);
}

function addReference(path : string, paths : string[]) {
	const projectPath = getProjectPath();
	if (projectPath == null) return;

	const pathToProject = vscode.Uri.joinPath(vscode.Uri.file(projectPath), getProjectName() + ".csproj");

	let pathSplit = path.split('.');
	let fileExt = pathSplit.pop();

	if (fileExt != "dll") { // cool thing i found on grepper
		vscode.window.showErrorMessage("Unable to add a reference to a non-dll file.");
		return;
	}

	vscode.window.showInformationMessage("Adding reference to " + path + "...");

	const fileContents = vscode.workspace.fs.readFile(pathToProject);
	let contentString = fileContents.then(
		(e) => {
			return e.toString();
		}
	); // idk how javascript works :P

	let filePath = pathSplit.join('.').split('\\');
	if (filePath.length == 1) {
		filePath = pathSplit.join('.').split('/');
	}

	let fileName = filePath.pop();

	return contentString.then( // i finally figured out how thenables work lol
		(value) => {
			let newContentString = (value).toString().replace("<!--NewReference-->", 
		`<Reference Include="` + fileName + `">
			<HintPath>` + path + `</HintPath>
		</Reference>
		<!--NewReference-->`);
		
			const newFileContents = Buffer.from(newContentString);
			vscode.workspace.fs.writeFile(pathToProject, newFileContents).then(
				() => {
					if (paths.length != 0) {
						let nextPath = paths.pop();
						while (nextPath == null) {
							nextPath = paths.pop();
						}
						addReference(nextPath, paths);
					}
				}
			);
		}
	);
}

async function handleMessages(type: string, value: string) {
	if (type == "create-project") {
		PROJECT_NAME = value;
		vscode.commands.executeCommand("gb-modding.createProject");
	}
	else if (type == "build-project") {
		vscode.commands.executeCommand("gb-modding.buildProject");
	}
	else if (type == "add-reference") {
		const paths = value.split(",");
		addReferences(paths);
	}

	// haha funny

	//vscode.commands.executeCommand("workbench.action.closeSidebar"); 
	//vscode.commands.executeCommand("workbench.view.explorer");
}

export function activate(context: vscode.ExtensionContext) {

	let busyBuilding = false;
	let busyCreating = false;

	setProjectName(); // my function naming skills are amazing...

	const provider = new SidebarProvider(context.extensionUri, handleMessages);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, provider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("gb-modding.createProject", function() {
			let projectPath = getProjectPath();
			if (projectPath == null) {
				vscode.window.showErrorMessage("Couldn't create project, because there isn't a workspace folder.");
				return;
			}

			if (projectExists(projectPath)) {
				vscode.window.showErrorMessage("Couldn't create project, because a project has already been created in this directory.");
				return;
			}

			const modName = getProjectName();

			if (!isValidName(modName)) 
			{
				vscode.window.showErrorMessage("Couldn't create project, because project name was invalid");
				return;
			}

			busyCreating = true;

			const terminal = vscode.window.createTerminal("you're getting hacked lol"); //just thought it would be funny lol

			terminal.sendText("dotnet new classlib --force -o " + projectPath + " -n " + modName + "\n");
			terminal.sendText("exit\n"); // sort of smart code i think bc im dumb
		})
	);
	
	context.subscriptions.push(vscode.commands.registerCommand("gb-modding.buildProject", function() {
		if (busyCreating) {
			vscode.window.showErrorMessage("Wait until the project is created to build.");
			return;
		}

		if (busyBuilding) {
			vscode.window.showErrorMessage("Already building.");
			return;
		}

		vscode.window.showInformationMessage("Building project...");

		busyBuilding = true;

		const terminal = vscode.window.createTerminal("you're getting hacked lol"); //just thought it would be funny lol

		terminal.sendText("dotnet build --no-dependencies -v 0 -o build\n");
		terminal.sendText("exit\n"); // sort of smart code i think bc im dumb
	}));

	vscode.window.onDidCloseTerminal(e => { // probably a dumb way of doing it but idc
		if (busyBuilding) 
		{
			busyBuilding = false;
			onBuildTClosed();
		}
		if (busyCreating) 
		{
			busyCreating = false;
			onCreatingTClosed();
		}
	});
}

function onBuildTClosed() {
	const projectPath = getProjectPath();
	if (projectPath == null) return;

	vscode.window.showInformationMessage("Finished building project!");

	// copy dll to mods folder
	const dll = vscode.Uri.joinPath(vscode.Uri.file(projectPath), "build", getProjectName() + ".dll");

	const modUri = vscode.Uri.file(getGBFolder());

	let target = vscode.Uri.joinPath(modUri, "Mods", getProjectName() + ".dll");
	
	
	if (modUri.path == "/") {
		vscode.window.showWarningMessage(
			"Set your Gang Beasts game directory in settings, to automatically build to your Mods folder."
		);
	}
	else {
		let deleted = false;
		vscode.workspace.fs.delete(target).then(
			() => {
				vscode.workspace.fs.copy(dll, target);
				deleted = true;
			}
		);
		
		if (deleted) return;
		vscode.workspace.fs.copy(dll, target);
	} 
}

function onCreatingTClosed() {
	let projectPath = getProjectPath();
	if (projectPath == null) return;

	const modName = getProjectName();
	const projectFilePath = vscode.Uri.joinPath(vscode.Uri.file(projectPath), modName + ".csproj");

	const writeData = Buffer.from(getDefaultProjectContents(), 'utf8')
	vscode.workspace.fs.writeFile(projectFilePath, writeData).
	then(function () {
		vscode.window.showInformationMessage("Project created successfully!");

		if (getGBFolder() == "") 
		{
			vscode.window.showWarningMessage(
				"Didn't add default references, because you haven't declared where your Gang Beasts folder is located."
			);
		} 
		else 
		{
			let base = vscode.Uri.joinPath(vscode.Uri.file(getGBFolder()), "Gang Beasts_Data", "Managed");

			let paths = [
				vscode.Uri.joinPath(base, "Assembly-CSharp.dll").path.substring(1),
				vscode.Uri.joinPath(base, "UnityEngine.CoreModule.dll").path.substring(1)
			];
			addReferences(paths);
		}
	});

	vscode.workspace.fs.delete(vscode.Uri.joinPath(vscode.Uri.file(projectPath), "Class1.cs"));

	const defaultClassPath = vscode.Uri.joinPath(vscode.Uri.file(projectPath), modName + ".cs");
	const classWriteData = Buffer.from(getDefaultFileContents(), 'utf8');

	vscode.workspace.fs.writeFile(defaultClassPath, classWriteData).then(
		() => {
			const terminal = vscode.window.createTerminal("you're getting hacked lol"); //just thought it would be funny lol

			terminal.sendText("dotnet restore\n");
			terminal.sendText("exit\n");
		}
	);
}

export function deactivate() {}
