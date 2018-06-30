import * as os from 'os'; // native node.js module
import { remote } from 'electron'; // native electron module
const jetpack = require('fs-jetpack'); // module loaded from npm
import env from './env';
import * as ko from 'knockout';
import * as moment_ from 'moment';

const moment = moment_;

var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());

console.log('The author of this app is:', appDir.read('package.json', 'json').author);

module noirtime {
  export class Tasks {
    constructor() {
      this.setMeta();
      this.setupData();
      this.bindEvents();
    }

    interval = null;
    filterResult = true;
    viewModel = {
      tasks: ko.observableArray(),
      count: ko.observable(0),
      showNoResults: ko.observable(false),
      date: '',
      time: {
        clean: 0,
        formatted: moment.utc(0).format('HH:mm:ss')
      },
      overall: {
        clean: 0,
        formatted: moment.utc(0).format('HH:mm:ss')
      }
    };

    currentTask = ko.observable('');
    time = {
      clean: 0,
      formatted: moment.utc(0).format('HH:mm:ss')
    };

    setMeta() {
      document.getElementById('app-meta-name').innerText = appDir.read('package.json', 'json').productName;
      document.getElementById('app-meta-description').innerText = appDir.read('package.json', 'json').description;
      document.getElementById('app-meta-version').innerText = appDir.read('package.json', 'json').version;
      document.getElementById('app-meta-copyright').innerText = appDir.read('package.json', 'json').copyright;
      document.getElementById('app-meta-web').innerText = appDir.read('package.json', 'json').homepage;

    }


    update(id: string, obj: any) {
      let taskID = 'noir.task-' + id;
      if (obj !== null) {
        let viewModelObj = JSON.parse(localStorage.getItem(taskID));
        viewModelObj = obj;
        localStorage.setItem(taskID, ko.toJSON(viewModelObj));
      } else {
        localStorage.removeItem(taskID);
        let deletionObj: Number = this.viewModel.tasks().findIndex(task => task.id === id);
        delete this.viewModel.tasks()[deletionObj];
      }
    }
    getTask(id: string) {
      return this.viewModel.tasks().find(task => task.id === id).index;
    }

    setupData() {
      let tasks: Array<string> = Object.keys(localStorage);
      let taskCount: number = tasks.filter(function(key) { return key.indexOf('noir.task-item') > -1 }).length;
      localStorage.setItem('noir.count', (taskCount - 1).toString());
      this.viewModel.count(taskCount === 0 ? 1 : taskCount);
      this.viewModel.date = localStorage.getItem('noir.today');
      if ((localStorage.getItem('noir.today') !== moment().format('DD/MM/YYYY')) === true) {
        localStorage.setItem('noir.today', moment().format('DD/MM/YYYY'));
        this.viewModel.date = moment().format('DD/MM/YYYY');
        this.buildTasks(true);
      } else {
        this.buildTasks(false);
      }


    }
    buildTasks(clear: Boolean) {
      let tasks: Array<string> = Object.keys(localStorage);
      let taskCount = tasks.filter(task => task.indexOf('noir.task-item') > -1);
      if (taskCount.length === 0) {
        let newTask = {
          id: 'item-1',
          index: 1,
          name: 'Idle',
          sticky: true,
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
        this.viewModel.tasks.push(newTask);
        localStorage.setItem('noir.task-item-1', ko.toJSON(this.viewModel.tasks()[0]));
      } else {
        for (let i = 0; i < tasks.length; i++) {
          if (tasks[i].indexOf('noir.task-item-') > -1) {
            let viewModelItem = JSON.parse(localStorage.getItem(tasks[i]));
            if (clear === true) {
              viewModelItem.time = {
                clean: 0,
                formatted: moment.utc(0).format('HH:mm:ss')
              };
            }
            viewModelItem.observables = {
              startBtn: ko.observable(true),
              pauseBtn: ko.observable(false),
              stopBtn: ko.observable(false)
            }
            this.viewModel.tasks.push(viewModelItem);
          }
        }
      }
      ko.applyBindings(this.viewModel);
    }

    bindEvents() {
      const _self = this;
      let filterInput: Element = document.querySelector('.filter-tasks');

      filterInput.addEventListener('keyup', (e: Event) => _self.filterTasks(e));

      document.addEventListener('click', (e: Event) => {
        if ((<HTMLElement>e.target).className.indexOf('task-start') > -1) {
          _self.startTimer(e);
        } else if ((<HTMLElement>e.target).className.indexOf('task-pause') > -1) {
          _self.pauseTimer(e);
        } else if ((<HTMLElement>e.target).className.indexOf('task-stop') > -1) {
          _self.stopTimer(e);
        } else if ((<HTMLElement>e.target).className.indexOf('task-delete') > -1) {
          _self.deleteTask(e);
        } else if ((<HTMLElement>e.target).className.indexOf('toggle-more') > -1) {
          _self.toggleMore(e);
        } else if ((<HTMLElement>e.target).className.indexOf('toggle-edit') > -1) {
          _self.editTask(e);
        }
      });
    }

    filterTasks(event: Event) {
      let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
      let filterValue = (<HTMLInputElement>event.target).value.toLowerCase();
      let visibleCount: Array<Element> = new Array;
      let adding: Boolean = false;

      if ((<KeyboardEvent>event).keyCode === 13 && filterValue !== '') {
        adding = true;
        this.viewModel.showNoResults(false);
        this.addTask();
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
        this.viewModel.showNoResults(true);
        console.log('TODO: Show enter btn');
      } else {
        this.viewModel.showNoResults(false);
      }
    }
    toggleMore(event: Event) {
      const taskRow: Element = event.srcElement.closest('.task-row');
      taskRow.querySelector('.task-action-list').classList.toggle('open');
    }
    editTask(event: Event) {
      const taskRow: Element = event.srcElement.closest('.task-row');
      let taskIndex = this.getTask(taskRow.id);

      if (taskRow.querySelector('.task-name').hasAttribute('contenteditable') === true) {
        taskRow.querySelector('.task-name').removeAttribute('contenteditable');
        let viewModelTask = this.viewModel.tasks().find(task => task.index === taskIndex);
        viewModelTask.name = taskRow.querySelector('.task-name').innerHTML;
        this.update(taskRow.id, viewModelTask);
      } else {
        taskRow.querySelector('.task-name').setAttribute('contenteditable', 'true');
      }

    }
    addTask() {
      let newCount: Number = this.viewModel.count() + 1;
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

      this.viewModel.count(newCount);

      this.viewModel.tasks.push(newTask);
      localStorage.setItem('noir.task-item-' + newTaskID, ko.toJSON(newTask));

      (<HTMLInputElement>document.querySelector('.filter-tasks')).value = '';
      (<HTMLInputElement>document.querySelector('.filter-tasks')).dispatchEvent(new KeyboardEvent('keyup', { 'key': 'a' }));
    }
    deleteTask(event: Event) {
      const taskRow: Element = event.srcElement.closest('.task-row');
      let taskIndex: String = this.getTask(taskRow.id);
      taskRow.remove();
      let newCount: Number = this.viewModel.count() - 1;
      this.viewModel.count(newCount);
      this.update(taskRow.id, null);
    }
    stopTimer(event: Event) {
      const taskRow: Element = event.srcElement.closest('.task-row');
      let taskIndex: String = this.getTask(taskRow.id);
      let viewModelTask = this.viewModel.tasks().find(task => task.index === taskIndex);
      let timerElement: Element = taskRow.querySelector('.task-time');
      clearInterval(this.interval);

      viewModelTask.time = {
        clean: 0,
        formatted: moment.utc(0).format('HH:mm:ss')
      };

      viewModelTask.observables.startBtn(true);
      viewModelTask.observables.stopBtn(false);
      viewModelTask.observables.pauseBtn(false);

      this.update(taskRow.id, viewModelTask);

      timerElement.innerHTML = '00:00:00';
    }
    pauseTimer(event: Event) {
      let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
      const taskRow: Element = event.srcElement.closest('.task-row');
      let taskIndex: String = this.getTask(taskRow.id);
      let viewModelTask = this.viewModel.tasks().find(task => task.index === taskIndex);
      viewModelTask.observables.startBtn(true);
      viewModelTask.observables.stopBtn(true);
      viewModelTask.observables.pauseBtn(false);
      this.currentTask('');
      this.update(taskRow.id, viewModelTask);

      clearInterval(this.interval);
      for (var i = 0; i < taskRows.length; ++i) {
        taskRows[i].classList.remove('disabled');
        taskRows[i].classList.remove('focus');
      }
    }
    startTimer(event: Event) {
      let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
      const taskRow: Element = event.srcElement.closest('.task-row');
      let _self = this;
      let taskIndex: String = this.getTask(taskRow.id);
      let viewModelTask = this.viewModel.tasks().find(task => task.index === taskIndex);
      let timerElement = taskRow.querySelector('.task-time');
      let overallTimerElement = taskRow.querySelector('.task-over-time');

      viewModelTask.observables.startBtn(false);
      viewModelTask.observables.stopBtn(false);
      viewModelTask.observables.pauseBtn(true);
      this.currentTask(taskRow.id);
      clearInterval(this.interval);
      for (var i = 0; i < taskRows.length; ++i) {
        if (taskRows[i].id === taskRow.id) {
          taskRows[i].classList.remove('disabled');
          taskRows[i].classList.add('focus');
        } else {
          taskRows[i].classList.add('disabled');
        }
      }
      this.interval = setInterval(function() {
        viewModelTask.time.clean++;;
        viewModelTask.time.formatted = moment.utc(viewModelTask.time.clean * 1000).format('HH:mm:ss');
        viewModelTask.overall.clean++;
        viewModelTask.overall.formatted = moment.utc(viewModelTask.overall.clean * 1000).format('HH:mm:ss');
        _self.update(taskRow.id, viewModelTask);
        timerElement.innerHTML = viewModelTask.time.formatted;
        overallTimerElement.innerHTML = viewModelTask.overall.formatted;
      }, 1000);
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var application = new noirtime.Tasks();
});







