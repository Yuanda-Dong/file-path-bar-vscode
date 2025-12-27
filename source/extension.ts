import * as vscode from 'vscode';
// import * as os from 'os';
import * as vscel from '@wraith13/vscel';
import packageJson from "../package.json";
import localeEn from "../package.nls.json";
import localeJa from "../package.nls.ja.json";
import { platform } from 'process';
export type LocaleKeyType = keyof typeof localeEn;
const locale = vscel.locale.make(localeEn, { "ja": localeJa });
const configRoot = vscel.config.makeRoot(packageJson);
const statusBarAlignmentObject = Object.freeze
({
    "none": undefined,
    "left": vscode.StatusBarAlignment.Left,
    "right": vscode.StatusBarAlignment.Right,
});
export const statusBarAlignment = configRoot.makeMapEntry("filePathBar.statusBarAlignment", "root-workspace", statusBarAlignmentObject);
const pathStyleObject = Object.freeze
({
    "absolute": (path: string) => path,
    "relative": (path: string) => {
        const p = path.split("\\");
        return p.slice(Math.max(0,p.length-2),p.length).join("/")
    },
});
export const pathStyle = configRoot.makeMapEntry ("filePathBar.pathStyle", "root-workspace", pathStyleObject);
const hasActiveDocument = () => undefined !== vscode.window.activeTextEditor && undefined !== vscode.window.activeTextEditor.viewColumn;
module StatusBarItem
{
    let pathLabel: vscode.StatusBarItem;
    export const make = () => pathLabel = vscel.statusbar.createItem
    ({
        alignment: statusBarAlignment.get("default-scope"),
        text: `$(file) dummy`,
        command: `filePathBar.menu`,
        tooltip: locale.map ( "filePathBar.menu.title" ),
        // priority: Number.MAX_SAFE_INTEGER
    });
    export const update = (): void =>
    {
        const document = vscode.window.activeTextEditor?.document;
        const workspaceFolder = document && vscode.workspace.getWorkspaceFolder(document.uri);
        const workspaceName = workspaceFolder ? workspaceFolder.name : "No Workspace";

        if (hasActiveDocument() && document) {
            pathLabel.text = `${pathStyle.get("default-scope")(document.fileName)} (${workspaceName})`;
            pathLabel.show();
        } else {
            pathLabel.hide();
        }
    };
}
module FilePathBar
{
    export const activate = (context: vscode.ExtensionContext) =>
    {
        context.subscriptions.push
        (
            StatusBarItem.make(),
            vscode.commands.registerCommand(`filePathBar.menu`, menu),
            vscode.workspace.onDidChangeConfiguration
            (
                async () =>
                {
                    //pathStyle.clear();
                    await update();
                }
            ),
            vscode.window.onDidChangeActiveTextEditor(update),
            vscode.workspace.onDidChangeTextDocument(update),
            vscode.workspace.onDidSaveTextDocument(update),
        );
        update ( );

        // Command to update the window title
        let disposable = vscode.commands.registerCommand('windowTitleChanger.updateTitle', () => {
            const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
            if (workspaceFolder) {
                const folderName = workspaceFolder.name;
                const parts = folderName.split('.');
                var lastPart = parts[parts.length - 1];
                lastPart += vscode.window?.activeTextEditor?.document.fileName
                vscode.workspace.getConfiguration('window').update("title",lastPart);
            }
        });

        context.subscriptions.push(disposable);

        // Update the window title on startup
        vscode.commands.executeCommand('windowTitleChanger.updateTitle');
    };
    export const deactivate = () =>
    {
    };
    export const update = async () =>
    {
        await vscode.commands.executeCommand
        (
            'setContext',
            'existsActiveTextDocument',
            hasActiveDocument()
        );
        StatusBarItem.update();
    };
    export const menu = async () =>
    {
        const document = vscode.window.activeTextEditor?.document;
        if (hasActiveDocument() && document)
        {
            const commands:
            {
                label: LocaleKeyType,
                command: string,
            }[] =
            [
                {
                    label: "darwin" === platform ?
                        "File: Reveal in Finder":
                        "File: Reveal in File Explorer",
                    command: "revealFileInOS",
                },
                {
                    label: "File: Copy Path of Active File",
                    command: "copyFilePath",
                },
                {
                    label: "File: Copy Relative Path of Active File",
                    command: "copyRelativeFilePath",
                },
                {
                    label: "File: Compare Active File With...",
                    command: "workbench.files.action.compareFileWith",
                },
                {
                    label: "File: Compare Active File with Clipboard",
                    command: "workbench.files.action.compareWithClipboard",
                },
                {
                    label: "File: Compare Active File with Saved",
                    command: "workbench.files.action.compareWithSaved",
                },
                {
                    label: "File: Reveal Active File in Side Bar",
                    command: "workbench.files.action.showActiveFileInExplorer",
                }
            ];
            await
            (
                await vscode.window.showQuickPick
                (
                    commands.map
                    (
                        i =>
                        ({
                            label: locale.map(i.label),
                            detail: i.label === locale.map(i.label) ? undefined: i.label,
                            action: async () => await vscode.commands.executeCommand(i.command, document.uri),
                        })
                    ),
                    {
                        matchOnDetail: true,
                    }
                )
            )
            ?.action();
        }
    };
}
export const activate = FilePathBar.activate;
export const deactivate = FilePathBar.deactivate;
