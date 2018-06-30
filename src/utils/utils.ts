import * as app from '../app';
import * as ko from 'knockout';

export module Utils {
	export function getTask(id: string) {
		return app.noirtime.prototype.viewModel.tasks().find(task => task.id === id).index;
	}
	export function update(id: string, obj: any) {
		let taskID = 'noir.task-' + id;
		if (obj !== null) {
			let viewModelObj = JSON.parse(localStorage.getItem(taskID));
			viewModelObj = obj;
			localStorage.setItem(taskID, ko.toJSON(viewModelObj));
		} else {
			localStorage.removeItem(taskID);
			let deletionObj: Number = app.noirtime.prototype.viewModel.tasks().findIndex(task => task.id === id);
			delete app.noirtime.prototype.viewModel.tasks()[deletionObj];
		}
	}
}