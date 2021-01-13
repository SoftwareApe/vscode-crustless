import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { isAbsolute, join } from 'path';
import { config } from 'process';

function getAbsolutePath(path: string): string | undefined {
    if (isAbsolute(path)) {
        // nothing to do
        return path;
    }

    // There's no absolute path for the empty path
    if (path === '') {
        return undefined;
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
    vscode.languages.registerDocumentRangeFormattingEditProvider(['c', 'cpp', 'csharp', 'objective-c', 'objective-cpp', 'd', 'java'], {
        provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range): vscode.TextEdit[] {
                let wholeLineRange = new vscode.Range (
                    new vscode.Position(range.start.line, 0),
                    new vscode.Position(range.end.line + 1, 0)
                );

                let text = document.getText(wholeLineRange);
                let configFile = getAbsolutePath('.uncrustify');
 
                try {
                    // --frag keeps the leading whitespace if the selection is only partial
                    let cmd = 'uncrustify --frag';
                    if (configFile !== undefined) {
                        if (!existsSync(configFile)) {
                            vscode.window.showErrorMessage("Config file '" + configFile + "' doesn't exist.");
                            return [];
                        }
                        cmd += ' -c ' + configFile;
                    }
                    let output = execSync(cmd, { input: text }).toString();

                    // replace whole text
                    //const firstLine = document.lineAt(0);
                    //const lastLine = document.lineAt(document.lineCount - 1);
                    //var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
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
