import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { isAbsolute, join } from 'path';
import { config } from 'process';

function getAbsolutePath(path: string | undefined): string | undefined {
    // There's no absolute path for the empty path
    if (path === null || path === undefined || path === '') {
        return undefined;
    }

    if (isAbsolute(path)) {
        // nothing to do
        return path;
    }

    // if it's not an absolute path, assume it's relative to the workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders === undefined || workspaceFolders.length === 0) {
        // we can't make this an absolute path if no workspace is open
        return undefined;
    }

    const rootFolder = workspaceFolders[0];
    return join(rootFolder.uri.fsPath, path);
}

export function activate(context: vscode.ExtensionContext) {
    let languageMap = new Map<string, string>();
    languageMap.set("c", "C");
    languageMap.set("cpp", "CPP");
    languageMap.set("csharp", "CS");
    languageMap.set("objective-c", "OC");
    languageMap.set("objective-cpp", "OC+");
    languageMap.set("d","D");
    languageMap.set("java", "JAVA");
    vscode.languages.registerDocumentRangeFormattingEditProvider(['c', 'cpp', 'csharp', 'objective-c', 'objective-cpp', 'd', 'java'], {
        provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range): vscode.TextEdit[] {
                let wholeLineRange = new vscode.Range (
                    new vscode.Position(range.start.line, 0),
                    new vscode.Position(range.end.line + 1, 0)
                );

                let uncrustifyLanguage = languageMap.get(document.languageId);

                if (uncrustifyLanguage === undefined) {
                    vscode.window.showErrorMessage("Missing language conversion for languageId " + document.languageId);
                    return [];
                }

                let text = document.getText(wholeLineRange);
                let config: string | undefined = vscode.workspace.getConfiguration('crustless').get('config');
                let executable: string | undefined = vscode.workspace.getConfiguration('crustless').get('uncrustify');
                if (executable === undefined) {
                    executable = "uncrustify";
                }
                let configFile = getAbsolutePath(config);

                if (configFile === undefined) {
                    vscode.window.showErrorMessage("Please specify uncrustify configuration in the settings (crustless.config).");
                    return [];
                }

                if (!existsSync(configFile)) {
                    vscode.window.showErrorMessage("Config file '" + configFile + "' doesn't exist.");
                    return [];
                }

                try {
                    execSync("which " + executable);
                } catch (_) {
                    vscode.window.showErrorMessage("Uncrustify not found at " + executable + ".");
                    return [];
                }

                try {
                    let cmd = executable;
                    if (range.start.line !== 0 || range.start.character !== 0) {
                        // --frag keeps the leading whitespace if the selection is only partial
                        cmd += ' --frag';
                    }
                    cmd += ' -c ' + configFile + " -l " + uncrustifyLanguage;
                    let output = execSync(cmd, { input: text }).toString();

                    return [vscode.TextEdit.replace(wholeLineRange, output)];

                } catch (error) {
                    vscode.window.showErrorMessage("Formatting with uncrustify failed with exit code " + error.status + ".\n" + error.message );
                }

                // no edits if it fails
                return [];
            }
        }
    );
}

// this method is called when your extension is deactivated
export function deactivate() {}
