import { autoUpdater } from 'electron-updater';

export default class AppUpdater {
	constructor() {
		autoUpdater.checkForUpdatesAndNotify();
	}
}