// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import * as path from 'path';
import * as url from 'url';
import { app, Menu, ipcMain, globalShortcut } from 'electron';
import { devMenuTemplate } from './menu/dev_menu_template';
import { editMenuTemplate } from './menu/edit_menu_template';
import createWindow from './helpers/window';

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from './env';

var mainWindow;

var setApplicationMenu = () => {
    var menus: any[] = [editMenuTemplate];
    if (env.name !== 'production') {
        menus.push(devMenuTemplate);
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== 'production') {
    var userDataPath = app.getPath('userData');
    app.setPath('userData', userDataPath + ' (' + env.name + ')');

}

app.on('ready', () => {
    setApplicationMenu();

    var mainWindow = createWindow('main', {
        width: 800,
        height: 600,
        titleBarStyle: 'hidden'
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'app.html'),
        protocol: 'file:',
        slashes: true
    }));

    if (env.name === 'development') {
        mainWindow.openDevTools();
    }
    globalShortcut.register('CommandOrControl+1', () => {
        mainWindow.webContents.send('shortcut-stop');
        mainWindow.webContents.focus();
    });
    globalShortcut.register('CommandOrControl+2', () => {
        mainWindow.webContents.send('shortcut-start');
        mainWindow.webContents.focus();
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
    app.quit();
});
