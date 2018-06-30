import * as app from '../app';
import * as util from './utils';
import * as ko from 'knockout';
import * as moment_ from 'moment';

const moment = moment_;


export module Events {
	export function startTimer(event: Event) {
		let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
		const taskRow: Element = event.srcElement.closest('.task-row');
		let taskIndex: String = util.Utils.getTask(taskRow.id);
		let viewModelTask = app.noirtime.prototype.viewModel.tasks().find(task => task.index === taskIndex);
		let timerElement = taskRow.querySelector('.task-time');
		let overallTimerElement = taskRow.querySelector('.task-over-time');

		viewModelTask.observables.startBtn(false);
		viewModelTask.observables.stopBtn(false);
		viewModelTask.observables.pauseBtn(true);
		app.noirtime.prototype.currentTask(taskRow.id);
		clearInterval(app.noirtime.prototype.interval);
		for (var i = 0; i < taskRows.length; ++i) {
			if (taskRows[i].id === taskRow.id) {
				taskRows[i].classList.remove('disabled');
				taskRows[i].classList.add('focus');
			} else {
				taskRows[i].classList.add('disabled');
			}
		}
		app.noirtime.prototype.interval = setInterval(function() {
			viewModelTask.time.clean++;;
			viewModelTask.time.formatted = moment.utc(viewModelTask.time.clean * 1000).format('HH:mm:ss');
			viewModelTask.overall.clean++;
			viewModelTask.overall.formatted = moment.utc(viewModelTask.overall.clean * 1000).format('HH:mm:ss');
			util.Utils.update(taskRow.id, viewModelTask);
			timerElement.innerHTML = viewModelTask.time.formatted;
			overallTimerElement.innerHTML = viewModelTask.overall.formatted;
		}, 1000);
	}
	export function pauseTimer(event: Event) {
		let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
		const taskRow: Element = event.srcElement.closest('.task-row');
		let taskIndex: String = util.Utils.getTask(taskRow.id);
		let viewModelTask = app.noirtime.prototype.viewModel.tasks().find(task => task.index === taskIndex);
		viewModelTask.observables.startBtn(true);
		viewModelTask.observables.stopBtn(true);
		viewModelTask.observables.pauseBtn(false);
		app.noirtime.prototype.currentTask('');
		util.Utils.update(taskRow.id, viewModelTask);

		clearInterval(app.noirtime.prototype.interval);
		for (var i = 0; i < taskRows.length; ++i) {
			taskRows[i].classList.remove('disabled');
			taskRows[i].classList.remove('focus');
		}
	}

	export function filterTasks(event: Event) {
		let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
		let filterValue = (<HTMLInputElement>event.target).value.toLowerCase();
		let visibleCount: Array<Element> = new Array;
		let adding: Boolean = false;

		if ((<KeyboardEvent>event).keyCode === 13 && filterValue !== '') {
			adding = true;
			app.noirtime.prototype.viewModel.showNoResults(false);
			Events.addTask();
		} else {
			adding = false;
			Array.from(taskRows).forEach(function(element) {
				element.querySelector('.task-name').textContent.toLowerCase().indexOf(filterValue) > -1 ? element.classList.remove('hide') : element.classList.add('hide');
				if (element.classList.contains('hide') === false) {
					visibleCount.push(element);
				}

			});
		}
		if (visibleCount.length === 0 && adding === false) {
			app.noirtime.prototype.viewModel.showNoResults(true);
			console.log('TODO: Show enter btn');
		} else {
			app.noirtime.prototype.viewModel.showNoResults(false);
		}
	}
	export function toggleMore(event: Event) {
		const taskRow: Element = event.srcElement.closest('.task-row');
		taskRow.querySelector('.task-action-list').classList.toggle('open');
	}
	export function editTask(event: Event) {
		const taskRow: Element = event.srcElement.closest('.task-row');
		let taskIndex = util.Utils.getTask(taskRow.id);

		if (taskRow.querySelector('.task-name').hasAttribute('contenteditable') === true) {
			taskRow.querySelector('.task-name').removeAttribute('contenteditable');
			let viewModelTask = app.noirtime.prototype.viewModel.tasks().find(task => task.index === taskIndex);
			viewModelTask.name = taskRow.querySelector('.task-name').innerHTML;
			util.Utils.update(taskRow.id, viewModelTask);
		} else {
			taskRow.querySelector('.task-name').setAttribute('contenteditable', 'true');
		}

	}
	export function addTask() {
		let newCount: Number = app.noirtime.prototype.viewModel.count() + 1;
		let newTaskID: Number = newCount;
		let newTaskName: String = (<HTMLInputElement>document.querySelector('.filter-tasks')).value;
		let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
		let newTask = {
			id: 'item-' + newTaskID,
			name: newTaskName,
			index: newTaskID,
			sticky: false,
			time: {
				clean: 0,
				formatted: moment.utc(0).format('HH:mm:ss')
			},
			overall: {
				clean: 0,
				formatted: moment.utc(0).format('HH:mm:ss')
			},
			observables: {
				startBtn: ko.observable(true),
				pauseBtn: ko.observable(false),
				stopBtn: ko.observable(false)
			}
		};

		app.noirtime.prototype.viewModel.count(newCount);

		app.noirtime.prototype.viewModel.tasks.push(newTask);
		localStorage.setItem('noir.task-item-' + newTaskID, ko.toJSON(newTask));

		(<HTMLInputElement>document.querySelector('.filter-tasks')).value = '';
		(<HTMLInputElement>document.querySelector('.filter-tasks')).dispatchEvent(new KeyboardEvent('keyup', { 'key': 'a' }));
	}
	export function deleteTask(event: Event) {
		const taskRow: Element = event.srcElement.closest('.task-row');
		let taskIndex: String = util.Utils.getTask(taskRow.id);
		taskRow.remove();
		let newCount: Number = app.noirtime.prototype.viewModel.count() - 1;
		app.noirtime.prototype.viewModel.count(newCount);
		util.Utils.update(taskRow.id, null);
	}
	export function stopTimer(event: Event) {
		const taskRow: Element = event.srcElement.closest('.task-row');
		let taskIndex: String = util.Utils.getTask(taskRow.id);
		let viewModelTask = app.noirtime.prototype.viewModel.tasks().find(task => task.index === taskIndex);
		let timerElement: Element = taskRow.querySelector('.task-time');
		clearInterval(app.noirtime.prototype.interval);

		viewModelTask.time = {
			clean: 0,
			formatted: moment.utc(0).format('HH:mm:ss')
		};

		viewModelTask.observables.startBtn(true);
		viewModelTask.observables.stopBtn(false);
		viewModelTask.observables.pauseBtn(false);

		util.Utils.update(taskRow.id, viewModelTask);

		timerElement.innerHTML = '00:00:00';
	}
}