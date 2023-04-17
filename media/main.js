(function () {
    const vscode = acquireVsCodeApi();

    const addReference = document.getElementById("add-reference-input");
    document.getElementById("add-reference").addEventListener('click', function() {
        addReference.click();
    });

    const projectName = document.getElementById("project-name");

    projectName.addEventListener('input', function(event) {
        const limit = 20;
        console.log("CHANGED");
        if (projectName.value.length > limit) {
            console.log("GREATER THAN LIMIT");
            projectName.value = projectName.value.substring(0, limit+1);
        }
    });

    document.getElementById("create-project").addEventListener('click', function() {
        console.log("easter egg"); // egg?
        vscode.postMessage({ type: 'create-project', value: projectName.value });
    });

    document.getElementById("build-project").addEventListener('click', function() {
        vscode.postMessage({ type: 'build-project', value: "" });
    });

    document.getElementById("publish-project").addEventListener('click', function() {
        vscode.postMessage({ type: 'publish-project', value: "" });
    });

    addReference.addEventListener('change', function(event) {
        let message = "";

        for (var i = 0; i < event.target.files.length; i++) {
            // this bypasses security...hopefully it doesn't get fixed. well...idk
            message += event.target.files[i].path + ","; 
        }
        message = message.substring(0, message.length-1);

        vscode.postMessage({ type: 'add-reference', value:  message});
    });
}());