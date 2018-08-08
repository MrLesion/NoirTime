import * as os from 'os'; // native node.js module
import { remote } from 'electron'; // native electron module
import env from '../env';
import * as ko from 'knockout';
import * as moment_ from 'moment';

const jetpack = require('fs-jetpack');
const app = remote.app;

export const base = {
	jetpack: require('fs-jetpack'),
	moment: moment_,
	app: app,
	remote: remote,
	appDir: jetpack.cwd(app.getAppPath()),
	ko: ko
}


export function versionCheck() {
	const localVersion = localStorage.getItem('noir.version');
	const currentVersion = base.appDir.read('package.json', 'json').version;
	const versionClear = base.appDir.read('package.json', 'json').updateclear;

	console.log(currentVersion);

	if (localVersion === null || localVersion !== currentVersion) {
		if (versionClear === 'true') {
			console.info('Clearing storage');
			localStorage.clear();
		}
		localStorage.setItem('noir.version', currentVersion);
	}

}