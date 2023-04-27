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
import { IncomingMessage } from 'http';

let PROJECT_NAME = "";
let GITHUB_REPO_NAME = "";

function isBaseDirectory(uri: vscode.Uri): boolean {
	return toRelativePath(uri) == "";
}

async function doesFileExist(uri: vscode.Uri): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(uri);
		return true;
	}
	catch
	{
		return false;
	}
}

function getGBFolder() {
	return String(vscode.workspace.getConfiguration().get("gangBeastsModding.gameDirectory"));
}

function getGitHubName() {
	return String(vscode.workspace.getConfiguration().get("gangBeastsModding.gitHubName"));
}

function getAuthorName(): string {
	return String(vscode.workspace.getConfiguration().get("gangBeastsModding.authorName"));
}

async function loadRepoName() {
	const projectPath = getProjectPath();
	if (projectPath == null) return;

	const configUri = vscode.Uri.joinPath(vscode.Uri.file(projectPath), ".git", "config");
	let url;
	try {
		url = /url = .*/gm.exec((await vscode.workspace.fs.readFile(configUri)).toString())?.[0];
	}
	catch
	{
		return;
	}

	if (url == null) {
		return;
	}

	let split = url.split('/');

	GITHUB_REPO_NAME = split[split.length - 1].split('.')[0];
}

function toRelativePath(uri: vscode.Uri): string {
	let split = uri.path.replace("\\", "/").split("/");
	while (split.length > 0 && split[0] != vscode.workspace.name) {
		split.shift();
	}
	split.shift();

	return split.join('/');
}

function getGitIgnoreUri(): vscode.Uri {
	const projectPath = getProjectPath();
	if (projectPath != null) {
		return vscode.Uri.joinPath(vscode.Uri.file(projectPath), ".gitignore");
	}
	return vscode.Uri.file("/");
}

async function getCMTUri(): Promise<vscode.Uri> {
	const projectPath = getProjectPath();
	if (projectPath == null) {
		return vscode.Uri.file("/");
	}

	const cmtUri = vscode.Uri.joinPath(vscode.Uri.file(projectPath), getProjectName() + ".cmt");
	if (!await doesFileExist(cmtUri)) {
		await createBaseCMTFile(cmtUri);
	}
	return cmtUri;
}

function getProjectPath() {
	let workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders == null) return;

	let path = workspaceFolders[0].uri.path;

	let finalPath = path.substring(1);
	return finalPath;
}

function projectExists(projectPath: string) {
	let files = fs.readdirSync(projectPath);

	let exists = false;
	for (const file of files) {
		if (file.split('.').pop() == "csproj") {
			exists = true;
			break;
		}
	}

	return exists;
}

function getGitBaseLink() {
	return "https://raw.githubusercontent.com/" + getGitHubName() + "/" + GITHUB_REPO_NAME + "/master";
}

async function removeUriFromGitIgnore(uri: vscode.Uri) {
	let contents = await vscode.workspace.fs.readFile(getGitIgnoreUri());

	let stringContents = contents.toString();
	let relativePath = toRelativePath(uri);
	stringContents = stringContents.replace('\n!' + relativePath, "");

	/*let folders = relativePath.split('/');
	let currentDir = "";
	let allFolders = [];
	for (let i = 0; i < folders.length - 1; i++)
	{
		currentDir += folders[i];
		allFolders.push(currentDir);
		currentDir += "/";
	}

	for (let i = allFolders.length - 1; i > -1; i--)
	{
		let regex =  new RegExp("!" + allFolders[i].replace("/", "\\/"), "gm");
		let matchCount = 0;

		while (regex.exec(stringContents) != null)
		{
			matchCount++;
		}

		console.log("MATCH COUNT:", matchCount, "; SEARCHING FOR:", regex);
		if (matchCount != null && matchCount < 2)
		{
			stringContents = stringContents.replace(allFolders[i] + "/*\n", "").replace("!" + allFolders[i] + "\n", "");
		}
	}*/

	await vscode.workspace.fs.writeFile(getGitIgnoreUri(), Buffer.from(stringContents));
}

async function addUriToGitIgnore(uri: vscode.Uri) {
	await removeUriFromGitIgnore(uri);

	vscode.workspace.fs.readFile(getGitIgnoreUri()).then((contents) => {
		let stringContents = contents.toString();
		let relativePath = toRelativePath(uri);

		let folders = relativePath.split('/');
		let currentDir = "";
		for (let i = 0; i < folders.length - 1; i++) {
			currentDir += folders[i];
			if (stringContents.includes(currentDir + "/*")) {
				currentDir += "/";
				continue;
			}

			stringContents += "\n!" + currentDir + "\n" + currentDir + "/*";
			currentDir += "/";
		}

		stringContents += "\n!" + relativePath;
		vscode.workspace.fs.writeFile(getGitIgnoreUri(), Buffer.from(stringContents));
	});
}

function getProjectName() {
	return PROJECT_NAME;
}

function isValidName(name: string) {
	// who actually knows how to use regexes like...stole from stackoverflow: https://stackoverflow.com/a/4434100
	const valid = /^[a-z]+$/i;

	return valid.test(name);
}

function getDefaultProjectContents() {
	return `<Project Sdk="Microsoft.NET.Sdk">

	<PropertyGroup>
	  <TargetFramework>netstandard2.0</TargetFramework>
	</PropertyGroup>

	<ItemGroup>
	  <!--NewReference-->
	</ItemGroup>

</Project>`;
}

function getVersionUri(): vscode.Uri {
	const projectPath = getProjectPath();
	if (projectPath != null) {
		return vscode.Uri.joinPath(vscode.Uri.file(projectPath), "version");
	}
	return vscode.Uri.file("/");
}

function getMessageUri(): vscode.Uri {
	const projectPath = getProjectPath();
	if (projectPath != null) {
		return vscode.Uri.joinPath(vscode.Uri.file(projectPath), "message");
	}
	return vscode.Uri.file("/");
}

async function incrementVersion() {
	vscode.workspace.fs.readFile(getVersionUri()).then(async (contents) => {
		let split = contents.toString().split('.');
		split[2] = (parseInt(split[2]) + 1).toString();
		await vscode.workspace.fs.writeFile(getVersionUri(), Buffer.from(split.join('.')));
	});
}


function getDefaultGitIgnoreFile() {
	return `
*
!version
!message
!${getProjectName()}.dll
!${getProjectName()}.cmt`;
}

function getDefaultFileContents() {
	const contents =
		`using System;
using UnityEngine;
using CementTools;

// This is an example Mod class
public class ` + getProjectName() + ` : CementMod {

	// The Cement Mod Class inherits from MonoBehaviour, so you can use all the methods of MonoBehaviour.

    public void Start() 
	{
		// Called once
		Cement.Log("Loaded my mod!");
    }
    
    public void Update() 
	{
		// Called once every frame, in every scene
    }
}`;

	return contents;
}

async function createBaseCMTFile(uri: vscode.Uri) {
	if (GITHUB_REPO_NAME == "") {
		return;
	}

	const cmt =
		`Name=${getProjectName()}
Author=${getAuthorName()}
Message=${getGitBaseLink() + "/message"}
CementFile=${getGitBaseLink() + "/" + getProjectName() + ".cmt"}
Links=${getGitBaseLink() + "/" + getProjectName() + ".dll"}
LatestVersion=${getGitBaseLink() + "/version"}
`;

	await vscode.workspace.fs.writeFile(uri, Buffer.from(cmt, "utf-8"));
}

// Sets the project name of your cs project not your project path which is different naming is hard
function setProjectName() {
	const projectPath = getProjectPath();
	if (projectPath == null) return;

	let files = fs.readdirSync(projectPath);

	for (const file of files) {
		let fileSplit = file.split('.');
		if (fileSplit.pop() == "csproj") {
			PROJECT_NAME = fileSplit.join('')
			return;
		}
	}
}

function addReferences(paths: string[]) {
	let firstPath = paths.pop();
	while (firstPath == null) {
		firstPath = paths.pop();
	}

	addReference(firstPath, paths);
}

function addReference(path: string, paths: string[]) {
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

function getLinkFromURI(uri: vscode.Uri): string {
	return getGitBaseLink() + "/" + encodeURIComponent(toRelativePath(uri));
}

async function addFileToCMTFile(uri: vscode.Uri) {
	addUriToGitIgnore(uri);
	const cmtUri = await getCMTUri();
	let lines = (await vscode.workspace.fs.readFile(cmtUri)).toString().split("\n");
	for (let i = 0; i < lines.length; i++) {
		let lineSplit = lines[i].split('=');
		if (lineSplit[0] != "Links") {
			continue;
		}

		let currentLinks = lineSplit[1];
		if (currentLinks != "") {
			currentLinks += ",";
		}
		currentLinks += getLinkFromURI(uri);

		lines[i] = "Links=" + currentLinks;
		break;
	}

	const newContents = Buffer.from(lines.join('\n'));
	await vscode.workspace.fs.writeFile(cmtUri, newContents);
}

async function removeFileFromCMTFile(uri: vscode.Uri) {
	const cmtUri = await getCMTUri();
	let lines = (await vscode.workspace.fs.readFile(cmtUri)).toString().split("\n");
	for (let i = 0; i < lines.length; i++) {
		let lineSplit = lines[i].split('=');
		if (lineSplit[0] != "Links") {
			continue;
		}

		const target = getLinkFromURI(uri);

		let oldLinks = lineSplit[1].split(',');
		let newLinks = [];

		for (let j = 0; j < oldLinks.length; j++) {
			if (oldLinks[j] != target) {
				newLinks.push(oldLinks[j]);
			}
		}

		lines[i] = "Links=" + newLinks.join(',');
		break;
	}

	const newContents = Buffer.from(lines.join('\n'));
	await vscode.workspace.fs.writeFile(cmtUri, newContents);
}

async function handleMessages(type: string, value: string) {
	if (type == "create-project") {
		PROJECT_NAME = value;
		vscode.commands.executeCommand("gb-modding.createProject");
	}
	else if (type == "build-project") {
		vscode.commands.executeCommand("gb-modding.buildProject");
	}
	else if (type == "publish-project") {
		vscode.commands.executeCommand("gb-modding.publishProject");
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

	let busyPublishing = false;
	let busyCreating = false;
	let busyBuilding = false;

	setProjectName(); // my function naming skills are amazing...

	const provider = new SidebarProvider(context.extensionUri, handleMessages);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, provider)
	);

	loadRepoName();
	context.subscriptions.push(
		vscode.commands.registerCommand("gb-modding.createProject", function () {
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

			if (!isValidName(modName)) {
				vscode.window.showErrorMessage("Couldn't create project, because project name was invalid");
				return;
			}

			busyCreating = true;

			const terminal = vscode.window.createTerminal("you're getting hacked lol"); //just thought it would be funny lol

			terminal.sendText("dotnet new classlib --force -o " + projectPath + " -n " + modName + "\n");
			terminal.sendText("exit\n"); // sort of smart code i think bc im dumb
		})
	);

	context.subscriptions.push(vscode.commands.registerCommand("gb-modding.addFileToGit", async function (uri: vscode.Uri) {
		if (isBaseDirectory(uri)) {
			vscode.window.showErrorMessage("Cannot add base directory to github repo.");
			return;
		}
		if (GITHUB_REPO_NAME == "") {
			await loadRepoName();
		}

		addUriToGitIgnore(uri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand("gb-modding.removeFileFromGit", async function (uri: vscode.Uri) {
		if (isBaseDirectory(uri)) {
			vscode.window.showErrorMessage("Cannot remove base directory to github repo.");
			return;
		}
		if (GITHUB_REPO_NAME == "") {
			await loadRepoName();
		}
		removeUriFromGitIgnore(uri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand("gb-modding.addFileToCMTFile", async function (uri: vscode.Uri) {
		if (isBaseDirectory(uri)) {
			vscode.window.showErrorMessage("Cannot add base directory to cement file.");
			return;
		}
		if (GITHUB_REPO_NAME == "") {
			await loadRepoName();
			if (GITHUB_REPO_NAME == "") {
				vscode.window.showErrorMessage("Publish your project to a public github repo, before trying to add files to your Cement file.");
				return;
			}
		}
		await removeFileFromCMTFile(uri);
		addFileToCMTFile(uri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand("gb-modding.removeFileFromCMTFile", async function (uri: vscode.Uri) {
		if (isBaseDirectory(uri)) {
			vscode.window.showErrorMessage("Cannot remove base directory to cement file.");
			return;
		}
		if (GITHUB_REPO_NAME == "") {
			await loadRepoName();
			if (GITHUB_REPO_NAME == "") {
				vscode.window.showErrorMessage("Publish your project to a public github repo, before trying to remove files from your Cement file.");
				return;
			}
		}
		removeFileFromCMTFile(uri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand("gb-modding.buildProject", async function () {
		if (busyCreating) {
			vscode.window.showErrorMessage("Wait until the project is created to build.");
			return;
		}
		if (busyPublishing) {
			vscode.window.showErrorMessage("Busy publishing...");
			return;
		}
		if (busyBuilding) {
			vscode.window.showErrorMessage("Already building...");
			return;
		}

		const projectPath = getProjectPath();
		if (projectPath == null) return;

		await loadRepoName();
		if (GITHUB_REPO_NAME == "") {
			vscode.window.showErrorMessage("You need to publish to a GitHub repo before test building.");
			return;
		}

		if (!(await doesFileExist(await getCMTUri()))) {
			vscode.window.showErrorMessage("You need a Cement (.cmt) file in order to test build mods.");
			return;
		}

		busyBuilding = true;

		vscode.window.showInformationMessage("Building project...");

		const terminal = vscode.window.createTerminal("you're getting hacked lol"); //just thought it would be funny lol

		terminal.sendText("dotnet build --no-dependencies -v 0 -o build\n");
		terminal.sendText("exit\n"); // sort of smart code i think bc im dumb
	}));


	context.subscriptions.push(vscode.commands.registerCommand("gb-modding.publishProject", async function () {
		if (busyCreating) {
			vscode.window.showErrorMessage("Wait until the project is created to build.");
			return;
		}
		if (busyPublishing) {
			vscode.window.showErrorMessage("Already publishing...");
			return;
		}
		if (busyBuilding) {
			vscode.window.showErrorMessage("Busy building...");
			return;
		}

		vscode.window.showInformationMessage("Publishing project...");

		busyPublishing = true;

		const terminal = vscode.window.createTerminal("you're getting hacked lol"); //just thought it would be funny lol

		await incrementVersion();

		terminal.sendText("dotnet build --no-dependencies -v 0 -o build\n");
		terminal.sendText("exit\n"); // sort of smart code i think bc im dumb
	}));

	vscode.window.onDidCloseTerminal(e => { // probably a dumb way of doing it but idc
		if (busyPublishing) {
			busyPublishing = false;
			onPublishTClosed();
		}
		else if (busyCreating) {
			busyCreating = false;
			onCreatingTClosed();
		}
		else if (busyBuilding) {
			busyBuilding = false;
			onBuildTClosed();
		}
	});
}

async function onBuildTClosed() {
	const projectPath = getProjectPath();
	if (projectPath == null) return;

	const cmtUri = await getCMTUri();

	var loadedCMT = {};
	let lines = (await vscode.workspace.fs.readFile(cmtUri)).toString().split('\n');
	for (let i = 0; i < lines.length; i++) {
		if (lines[i] == "") {
			continue;
		}
		let split = lines[i].split('=');
		(loadedCMT as any)[split[0]] = split.splice(1).join('=').replace("\r", "");
	}

	let gbFolder = getGBFolder();
	let modCacheFolderName = (loadedCMT as any)['Author'] + '.' + (loadedCMT as any)['Name'];
	const baseURIForCache = vscode.Uri.joinPath(vscode.Uri.file(gbFolder), "Gang Beasts_Data", "modcache", modCacheFolderName);

	console.log(baseURIForCache);
	if (!await doesFileExist(baseURIForCache))
	{
		vscode.window.showErrorMessage("No modcache folder found for current project. Publish your project and run Gang Beasts.");
		return;
	}
	try 
	{
		let pathToNewDLL = vscode.Uri.joinPath(vscode.Uri.file(projectPath), getProjectName() + ".dll");
		if (await doesFileExist(pathToNewDLL)) {
			await vscode.workspace.fs.delete(pathToNewDLL);
		}

		let pathToDLL = vscode.Uri.joinPath(vscode.Uri.file(projectPath), "build", getProjectName() + ".dll");
		if (await doesFileExist(pathToDLL)) {
			await vscode.workspace.fs.copy(pathToDLL, pathToNewDLL);
		}

		let links = (loadedCMT as any)['Links'].split(',');
		let githubLink = getGitBaseLink() + "/";
		for (let i = 0; i < links.length; i++) {
			let relativePath = links[i].replace(githubLink, "");
			const file = vscode.Uri.joinPath(vscode.Uri.file(projectPath), relativePath);
			const target = vscode.Uri.joinPath(baseURIForCache, relativePath);

			if (await doesFileExist(target)) 
			{
				await vscode.workspace.fs.delete(target);
			}
			
			console.log(target);
			try
			{
				await vscode.workspace.fs.copy(file, target);
			}
			catch (e)
			{
				continue;
			}
		}

		vscode.window.showInformationMessage("Succesfully built test for mod!");
	}
	catch
	{
		vscode.window.showErrorMessage("Failed to test build mod. Try publishing your project and running gang beasts. Make sure you also have a modcache folder setup.");
		return;
	}
}

async function onPublishTClosed() {
	const projectPath = getProjectPath();
	if (projectPath == null) return;

	// copy cmt to mods folder
	await loadRepoName();
	const cmtFile = await getCMTUri();
	const modUri = vscode.Uri.file(getGBFolder());

	let target = vscode.Uri.joinPath(modUri, "Mods", getProjectName() + ".cmt");

	let pathToNewDLL = vscode.Uri.joinPath(vscode.Uri.file(projectPath), getProjectName() + ".dll");
	if (await doesFileExist(pathToNewDLL)) {
		await vscode.workspace.fs.delete(pathToNewDLL);
	}

	let pathToDLL = vscode.Uri.joinPath(vscode.Uri.file(projectPath), "build", getProjectName() + ".dll");
	if (await doesFileExist(pathToDLL)) {
		await vscode.workspace.fs.copy(pathToDLL, pathToNewDLL);
	}

	if (modUri.path == "/") {
		vscode.window.showWarningMessage(
			"Set your Gang Beasts game directory in settings, to automatically build to your Mods folder."
		);
	}
	else {
		if (await doesFileExist(target)) {
			await vscode.workspace.fs.delete(target);
		}

		if (await doesFileExist(cmtFile)) {
			await vscode.workspace.fs.copy(cmtFile, target);
		}
	}

	vscode.commands.executeCommand("git.stageAll");
	vscode.commands.executeCommand("git.commitAll");

	vscode.window.showInformationMessage("Finished publishing project!");
}

async function onCreatingTClosed() {
	let projectPath = getProjectPath();
	if (projectPath == null) return;

	const modName = getProjectName();
	const projectFilePath = vscode.Uri.joinPath(vscode.Uri.file(projectPath), modName + ".csproj");

	const writeData = Buffer.from(getDefaultProjectContents(), 'utf8');
	await vscode.workspace.fs.writeFile(projectFilePath, writeData).
		then(function () {
			vscode.window.showInformationMessage("Project created successfully!");

			if (getGBFolder() == "") {
				vscode.window.showWarningMessage(
					"Didn't add default references, because you haven't declared where your Gang Beasts folder is located."
				);
			}
			else {
				let base = vscode.Uri.joinPath(vscode.Uri.file(getGBFolder()), "Gang Beasts_Data", "Managed");

				let paths = [
					vscode.Uri.joinPath(base, "Assembly-CSharp.dll").path.substring(1),
					vscode.Uri.joinPath(base, "UnityEngine.CoreModule.dll").path.substring(1),
					vscode.Uri.joinPath(base, "UnityEngine.dll").path.substring(1),
					vscode.Uri.joinPath(vscode.Uri.file(getGBFolder()), "BepInEx", "plugins", "Cement", "Cement.dll").path.substring(1),
					vscode.Uri.joinPath(vscode.Uri.file(getGBFolder()), "BepInEx", "core", "BepInEx.dll").path.substring(1)
				];
				addReferences(paths);
			}

			vscode.commands.executeCommand("git.init");

			const projectPath = getProjectPath();
			if (projectPath == null) {
				return;
			}
			const gitIgnoreContents = Buffer.from(getDefaultGitIgnoreFile(), 'utf8');
			vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.Uri.file(projectPath), ".gitignore"), gitIgnoreContents).then(() => {
				vscode.workspace.fs.writeFile(getVersionUri(), Buffer.from("0.0.0"));
				vscode.workspace.fs.writeFile(getMessageUri(), Buffer.from("This is a custom message!"));
			});
		});

	vscode.workspace.fs.delete(vscode.Uri.joinPath(vscode.Uri.file(projectPath), "Class1.cs"));

	const defaultClassPath = vscode.Uri.joinPath(vscode.Uri.file(projectPath), modName + ".cs");
	const classWriteData = Buffer.from(getDefaultFileContents(), 'utf8');

	await vscode.workspace.fs.writeFile(defaultClassPath, classWriteData).then(
		() => {
			const terminal = vscode.window.createTerminal("you're getting hacked lol"); //just thought it would be funny lol

			terminal.sendText("dotnet restore\n");
			terminal.sendText("exit\n");
		}
	);
}

export function deactivate() { }
