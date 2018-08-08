import * as utils from '../utils/index';

export function setup() {
	console.log('The author of this app is:', utils.base.appDir.read('package.json', 'json').author);
}

export function update() {
	console.log('update');
}