import * as os from 'os'; // native node.js module
import { remote } from 'electron'; // native electron module
import env from './env';
import * as ko from 'knockout';
import * as moment_ from 'moment';

const jetpack = require('fs-jetpack');
const moment = moment_;
const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());

const addEvent = document.addEventListener;

console.log('The author of this app is:', appDir.read('package.json', 'json').author);



module noirtime {
  export class Tasks {
    interval: any = null;
    filterResult: boolean = true;
    currentTask = ko.observable('');
    dragDomElm: HTMLElement = null;
    dropDomElm: HTMLElement = null;
    time = {
      clean: 0,
      formatted: moment.utc(0).format('HH:mm:ss')
    };
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

    constructor() {
      this.setMeta();
      this.versionCheck();
    }
    setMeta() {
      document.getElementById('app-meta-name').innerText = appDir.read('package.json', 'json').productName;
      document.getElementById('app-meta-description').innerText = appDir.read('package.json', 'json').description;
      document.getElementById('app-meta-version').innerText = appDir.read('package.json', 'json').version;
      document.getElementById('app-meta-copyright').innerText = appDir.read('package.json', 'json').copyright;
      document.getElementById('app-meta-web').innerText = appDir.read('package.json', 'json').homepage;
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
    versionCheck() {
      const localVersion = localStorage.getItem('noir.version');
      const currentVersion = appDir.read('package.json', 'json').version;
      const versionClear = appDir.read('package.json', 'json').updateclear;

      if (localVersion === null || localVersion !== currentVersion) {
        if (versionClear === 'true') {
          console.info('Clearing storage');
          localStorage.clear();
        }
        localStorage.setItem('noir.version', currentVersion);
      }
      this.setupData();
      this.bindEvents();
    }
    update(id: string, main: object) {
      let taskID = 'noir.task-' + id;;
      if (main !== null) {
        let viewModelObj = JSON.parse(localStorage.getItem(taskID));
        viewModelObj = main;
        localStorage.setItem(taskID, ko.toJSON(viewModelObj));
      } else {
        localStorage.removeItem(taskID);
        const index: number = this.viewModel.tasks().findIndex(task => task.id === id);
        this.viewModel.tasks().splice(index, 1);
      }
    }
    newTask(idx: string, inx: number, title: string, isSticky: boolean) {
      return {
        id: idx,
        index: inx,
        name: title,
        sticky: isSticky,
        child: ko.observable(false),
        parent: {
          id: ko.observable(''),
          name: ko.observable('')
        },
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
    }

    getTask(id: string) {
      return this.viewModel.tasks().find(task => task.id === id).index;
    }
    buildTasks(clear: Boolean) {
      let tasks: Array<string> = Object.keys(localStorage);
      let taskCount = tasks.filter(task => task.indexOf('noir.task-item') > -1);
      if (taskCount.length === 0) {
        let newTask = this.newTask('item-1', 1, 'Idle', true);
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
            viewModelItem.child = ko.observable(viewModelItem.child);
            viewModelItem.parent = {
              id: ko.observable(viewModelItem.parent.id),
              name: ko.observable(viewModelItem.parent.name),
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

      addEvent('click', (e: Event) => {
        e.preventDefault();
        if ((<HTMLElement>e.target).className.indexOf('task-start') > -1 || (<HTMLElement>e.target).parentElement.className.indexOf('task-start') > -1) {
          _self.startTimer(e);
        } else if ((<HTMLElement>e.target).className.indexOf('task-pause') > -1 || (<HTMLElement>e.target).parentElement.className.indexOf('task-pause') > -1) {
          _self.pauseTimer(e);
        } else if ((<HTMLElement>e.target).className.indexOf('task-stop') > -1 || (<HTMLElement>e.target).parentElement.className.indexOf('task-stop') > -1) {
          _self.stopTimer(e);
        } else if ((<HTMLElement>e.target).className.indexOf('task-delete') > -1) {
          //_self.deleteTask(e);
          _self.popDialog('Delete task', 'Do you really want to delete this task?', _self.deleteTask, e);
        } else if ((<HTMLElement>e.target).className.indexOf('toggle-more') > -1 || (<HTMLElement>e.target).parentElement.className.indexOf('toggle-more') > -1) {
          _self.toggleMore(e);
        } else if ((<HTMLElement>e.target).className.indexOf('toggle-edit') > -1) {
          _self.editTask(e);
        }
      });


      addEvent('dragenter', (e: Event) => {
        if ((<HTMLElement>e.target).className.indexOf('dropzone') > -1) {
          (<HTMLElement>e.target).classList.add('over');
          this.dropDomElm = (<HTMLElement>(<HTMLElement>e.target).closest('.task-row'));
        }
      }, false);

      addEvent('dragleave', (e: Event) => {
        (<HTMLElement>e.target).classList.remove('over');
      }, false);

      addEvent('dragstart', (e: Event) => {
        if ((<HTMLElement>e.target).className.indexOf('draghandle') > -1) {
          this.dragDomElm = (<HTMLElement>(<HTMLElement>e.target).closest('.task-row'));
          this.dragDomElm.classList.add('dragging');
          let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
          Array.from(taskRows).forEach(function(element) {
            if (element.classList.contains('dragging') === false) {
              element.querySelector('.draghandle').classList.add('hide');
              element.querySelector('.dropzone').classList.add('active');
            } else {
              element.querySelector('.dropzone').classList.add('deactive');
            }

          });
          (<HTMLElement>e.target).style.opacity = '.2';
          (<any>e).dataTransfer.effectAllowed = 'copy';
          (<any>e).dataTransfer.setData('text/plain', null);
        }
      });


      addEvent('dragend', (e: Event) => {
        let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');

        Array.from(taskRows).forEach(function(element) {
          element.querySelector('.draghandle').classList.remove('hide');
          element.querySelector('.dropzone').classList.remove('active', 'deactive');
        });
        this.dragDomElm.classList.remove('dragging');
        this.dropDomElm.classList.remove('over');
        this.addTaskToParent(this.dropDomElm, this.dragDomElm);
        (<HTMLElement>e.target).style.opacity = '1';
      }, false);
    }



    popDialog(title: string, message: string, callback, event: Event) {
      const _self = this;
      remote.dialog.showMessageBox({
        type: 'question',
        buttons: ['Yes', 'No'],
        title: title,
        message: message,
      }, function(response: number) {
        callback(event, response, _self);
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
      let viewModelMainTask = this.viewModel.tasks().find(task => task.index === taskIndex);

      if (taskRow.querySelector('.task-name').hasAttribute('contenteditable') === true) {
        taskRow.querySelector('.task-name').removeAttribute('contenteditable');
        viewModelMainTask.name = taskRow.querySelector('.task-name').innerHTML;

        this.update(taskRow.id, viewModelMainTask);
      } else {
        taskRow.querySelector('.task-name').setAttribute('contenteditable', 'true');
        if (taskRow.id.indexOf('sub-item') === -1) {
          this.toggleMore(event);
        }
      }

    }
    addTask() {
      const taskIdxs: Array<number> = this.viewModel.tasks().map(t => { return t.index });
      let newTaskIndex: number = 0;
      let isSearching: boolean = true;
      let indexTry: number = 1;
      while (isSearching === true) {
        if (taskIdxs.indexOf(indexTry) === -1) {
          isSearching = false;
          newTaskIndex = indexTry;
        } else {
          indexTry++;
        }
      }
      let newTaskID: number = newTaskIndex;
      let newTaskName: string = (<HTMLInputElement>document.querySelector('.filter-tasks')).value;
      let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
      let newTask = this.newTask('item-' + newTaskID, newTaskID, newTaskName, false);

      this.viewModel.count(taskIdxs.length + 1);

      this.viewModel.tasks.push(newTask);
      localStorage.setItem('noir.task-item-' + newTaskID, ko.toJSON(newTask));

      (<HTMLInputElement>document.querySelector('.filter-tasks')).value = '';
      (<HTMLInputElement>document.querySelector('.filter-tasks')).dispatchEvent(new KeyboardEvent('keyup', { 'key': 'a' }));
    }
    addTaskToParent(parent: HTMLElement, child: HTMLElement) {
      let childIndex: String = this.getTask(child.id);
      let viewModelMainTask = this.viewModel.tasks().find(task => task.index === childIndex);
      viewModelMainTask.parent.id = parent.id;
      viewModelMainTask.parent.name = parent.querySelector('.task-name').innerHTML;
      viewModelMainTask.child(true);
      child.querySelector('.parent-name').innerHTML = viewModelMainTask.parent.name;
      this.update(child.id, viewModelMainTask);
    }
    deleteTask(event: Event, response: number, _self) {
      if (response === 0) {
        const taskRow: Element = event.srcElement.closest('.task-row');
        let taskIndex: String = _self.getTask(taskRow.id);
        let viewModelMainTask = _self.viewModel.tasks().find(task => task.index === taskIndex);
        taskRow.remove();
        let newCount: Number = _self.viewModel.count() - 1;
        _self.viewModel.count(newCount);
        _self.update(taskRow.id, null);
      } else {
        _self.toggleMore(event);
      }

    }
    stopTimer(event: Event) {
      const taskRow: Element = event.srcElement.closest('.task-row');
      let taskIndex: String = this.getTask(taskRow.id);
      let viewModelMainTask = this.viewModel.tasks().find(task => task.index === taskIndex);
      let timerElement: Element = taskRow.querySelector('.task-time');
      clearInterval(this.interval);

      viewModelMainTask.time = {
        clean: 0,
        formatted: moment.utc(0).format('HH:mm:ss')
      };

      viewModelMainTask.observables.startBtn(true);
      viewModelMainTask.observables.stopBtn(false);
      viewModelMainTask.observables.pauseBtn(false);

      this.update(taskRow.id, viewModelMainTask);
      this.toggleMore(event);
      timerElement.innerHTML = '00:00:00';

    }
    pauseTimer(event: Event) {
      let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
      const taskRow: Element = event.srcElement.closest('.task-row');
      let taskIndex: String = this.getTask(taskRow.id);
      let viewModelMainTask = this.viewModel.tasks().find(task => task.index === taskIndex);
      viewModelMainTask.observables.startBtn(true);
      viewModelMainTask.observables.stopBtn(true);
      viewModelMainTask.observables.pauseBtn(false);

      this.currentTask('');
      this.update(taskRow.id, viewModelMainTask);

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
      let viewModelMainTask = this.viewModel.tasks().find(task => task.index === taskIndex);
      let overallTimerElement = taskRow.querySelector('.task-over-time');
      viewModelMainTask.observables.startBtn(false);
      viewModelMainTask.observables.stopBtn(false);
      viewModelMainTask.observables.pauseBtn(true);

      let timerElement = taskRow.querySelector('.task-time');

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
        viewModelMainTask.time.clean++;;
        viewModelMainTask.time.formatted = moment.utc(viewModelMainTask.time.clean * 1000).format('HH:mm:ss');
        viewModelMainTask.overall.clean++;
        viewModelMainTask.overall.formatted = moment.utc(viewModelMainTask.overall.clean * 1000).format('HH:mm:ss');
        overallTimerElement.innerHTML = viewModelMainTask.overall.formatted;
        if (viewModelMainTask.parent.id() !== '') {
          const taskParentIndex = _self.getTask(viewModelMainTask.parent.id());
          const viewModelParentTask = _self.viewModel.tasks().find(task => task.index === taskParentIndex);
          let overallTimerParentElement = document.getElementById(viewModelMainTask.parent.id()).querySelector('.task-over-time');
          viewModelParentTask.overall.clean++;
          viewModelParentTask.overall.formatted = moment.utc(viewModelParentTask.overall.clean * 1000).format('HH:mm:ss');
          overallTimerParentElement.innerHTML = viewModelParentTask.overall.formatted;
          _self.update(viewModelMainTask.parent.id(), viewModelParentTask);
        }
        overallTimerElement.innerHTML = viewModelMainTask.overall.formatted;
        timerElement.innerHTML = viewModelMainTask.time.formatted;
        _self.update(taskRow.id, viewModelMainTask);


      }, 1000);

    }
  }
}

addEvent('DOMContentLoaded', function() {
  var application = new noirtime.Tasks();
});







