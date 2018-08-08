import * as os from 'os'; // native node.js module
import { remote, ipcRenderer } from 'electron'; // native electron module
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
    previousTask = ko.observable('');
    dragDomElm: HTMLElement = null;
    dropDomElm: HTMLElement = null;
    time = {
      clean: 0,
      formatted: moment.utc(0).format('HH:mm:ss')
    };
    newTask = (idx: string, inx: number, title: string, isSticky: boolean) => {
      return {
        id: idx,
        index: inx,
        name: title,
        sticky: isSticky,
        child: ko.observable(false),
        sortOrder: ko.observable(inx),
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
    };
    viewModel = {
      tasks: ko.observableArray(),
      count: ko.observable(0),
      showNoResults: ko.observable(false),
      toolToggleIdleOnStop: ko.observable(false),
      date: '',
      time: {
        clean: 0,
        formatted: moment.utc(0).format('HH:mm:ss')
      },
      overall: {
        clean: 0,
        formatted: moment.utc(0).format('HH:mm:ss')
      },
      clickHandler: (callback: any, data: any) => {
        this.currentTask(data.id);
        this.actions[callback]();
      }
    };
    actions = {
      setMeta: () => {
        document.getElementById('app-meta-name').innerText = appDir.read('package.json', 'json').productName;
        document.getElementById('app-meta-description').innerText = appDir.read('package.json', 'json').description;
        document.getElementById('app-meta-version').innerText = appDir.read('package.json', 'json').version;
        document.getElementById('app-meta-copyright').innerText = appDir.read('package.json', 'json').copyright;
        document.getElementById('app-meta-web').innerText = appDir.read('package.json', 'json').homepage;
      },
      versionCheck: () => {
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
        this.actions.setupData();
        this.actions.bindEvents();
      },
      setupData: () => {
        let tasks: Array<string> = Object.keys(localStorage);
        let taskCount: number = tasks.filter(function(key) { return key.indexOf('noir.task-item') > -1 }).length;
        localStorage.setItem('noir.count', (taskCount - 1).toString());
        this.viewModel.count(taskCount === 0 ? 1 : taskCount);
        this.viewModel.date = localStorage.getItem('noir.today');
        if ((localStorage.getItem('noir.today') !== moment().format('DD/MM/YYYY')) === true) {
          localStorage.setItem('noir.today', moment().format('DD/MM/YYYY'));
          this.viewModel.date = moment().format('DD/MM/YYYY');
          this.actions.buildTasks(true);
        } else {
          this.actions.buildTasks(false);
        }
      },
      bindEvents: () => {
        const _self = this;
        let filterInput: Element = document.querySelector('.filter-tasks');

        ipcRenderer.on('shortcut-stop', () => {
          if (_self.currentTask() !== '') {
            _self.actions.stopTimer();
          }
        }).on('shortcut-start', () => {
          console.log('TODO - stop current task, start previous task');
        });

        filterInput.addEventListener('keyup', (e: Event) => _self.actions.filterTasks(e));

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
              if (element.classList.contains('dragging') === false && element.classList.contains('parentable') === true) {
                element.querySelector('.draghandle').classList.add('hide');
                element.querySelector('.dropzone').classList.add('active');
                element.classList.add('expand');
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
            element.classList.remove('expand');
          });
          this.dragDomElm.classList.remove('dragging');
          this.dropDomElm.classList.remove('over');
          this.actions.addTaskToParent(this.dropDomElm, this.dragDomElm);
          (<HTMLElement>e.target).style.opacity = '1';
        }, false);
      },
      buildTasks: (clear: Boolean) => {
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
              viewModelItem.sortOrder = ko.observable(viewModelItem.sortOrder);
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
      },
      filterTasks: (event: Event) => {
        let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
        let filterValue = (<HTMLInputElement>event.target).value.toLowerCase();
        let visibleCount: Array<Element> = new Array;
        let adding: Boolean = false;

        if ((<KeyboardEvent>event).keyCode === 13 && filterValue !== '') {
          adding = true;
          this.viewModel.showNoResults(false);
          this.actions.addTask();
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
        } else {
          this.viewModel.showNoResults(false);
        }
      },
      getTask: (id: string) => {
        return this.viewModel.tasks().find(task => task.id === id).index;
      },
      updateTask(id: string, main: object, self?: object) {
        const _self = self !== undefined ? self : this;
        const taskID = 'noir.task-' + id;
        if (main !== null) {
          let viewModelObj = JSON.parse(localStorage.getItem(taskID));
          viewModelObj = main;
          localStorage.setItem(taskID, ko.toJSON(viewModelObj));
        } else {
          localStorage.removeItem(taskID);
          const index: number = _self.viewModel.tasks().findIndex(task => task.id === id);
          _self.viewModel.tasks().splice(index, 1);
        }
      },
      editTask: () => {
        const TaskID = this.currentTask();
        const taskRow: Element = document.getElementById(TaskID);
        let taskIndex = this.actions.getTask(TaskID);
        let viewModelMainTask = this.viewModel.tasks().find(task => task.index === taskIndex);

        if (taskRow.querySelector('.task-name').hasAttribute('contenteditable') === true) {
          taskRow.querySelector('.task-name').removeAttribute('contenteditable');
          viewModelMainTask.name = taskRow.querySelector('.task-name').innerHTML;

          this.actions.updateTask(TaskID, viewModelMainTask);
        } else {
          taskRow.querySelector('.task-name').setAttribute('contenteditable', 'true');
          if (TaskID.indexOf('sub-item') === -1) {
            this.actions.toggleMore();
          }
        }

      },
      addTask: () => {
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
      },
      addTaskToParent: (parent: HTMLElement, child: HTMLElement) => {
        let childIndex: String = this.actions.getTask(child.id);
        let viewModelMainTask = this.viewModel.tasks().find(task => task.index === childIndex);
        viewModelMainTask.parent.id(parent.id);
        viewModelMainTask.parent.name(parent.querySelector('.task-name').innerHTML);
        viewModelMainTask.child(true);
        child.querySelector('.parent-name').innerHTML = viewModelMainTask.parent.name();
        this.actions.updateTask(child.id, viewModelMainTask);
        //this.updateSortOrder();
      },
      deleteTask: (response: number, _self) => {
        const TaskID = _self.currentTask();
        if (response === 0) {
          const taskRow: Element = document.getElementById(TaskID);
          let taskIndex: String = _self.actions.getTask(TaskID);
          let viewModelMainTask = _self.viewModel.tasks().find(task => task.index === taskIndex);
          taskRow.remove();
          let newCount: Number = _self.viewModel.count() - 1;
          _self.viewModel.count(newCount);
          _self.actions.updateTask(TaskID, null, _self);
        } else {
          _self.actions.toggleMore();
        }
      },
      deleteDialog: () => {
        const _self = this;
        remote.dialog.showMessageBox({
          type: 'question',
          buttons: ['Yes', 'No'],
          title: 'Delete task',
          message: 'Do you really want to delete this task?',
        }, function(response: number) {
          _self.actions.deleteTask(response, _self);
        });
      },
      toggleIdle: () => {
        this.currentTask('item-1');
        this.actions.startTimer();
      },
      toggleMore: () => {
        const TaskID = this.currentTask();
        const taskRow: Element = document.getElementById(TaskID);
        taskRow.querySelector('.task-action-list').classList.toggle('open');
      },
      resetTimer: () => {
        const TaskID = this.currentTask();
        const taskRow: Element = document.getElementById(TaskID);
        let taskIndex: String = this.actions.getTask(TaskID);
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

        this.actions.updateTask(TaskID, viewModelMainTask);
        this.actions.toggleMore();
        timerElement.innerHTML = '00:00:00';

      },
      stopTimer: () => {
        const TaskID = this.currentTask();
        let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
        const taskRow: Element = document.getElementById(TaskID);
        let taskIndex: String = this.actions.getTask(TaskID);
        let viewModelMainTask = this.viewModel.tasks().find(task => task.index === taskIndex);
        viewModelMainTask.observables.startBtn(true);
        viewModelMainTask.observables.stopBtn(true);
        viewModelMainTask.observables.pauseBtn(false);
        this.actions.updateTask(TaskID, viewModelMainTask);

        clearInterval(this.interval);
        this.previousTask(TaskID);
        this.currentTask('');
        for (var i = 0; i < taskRows.length; ++i) {
          taskRows[i].classList.remove('disabled');
          taskRows[i].classList.remove('focus');
        }
        if (TaskID !== 'item-1') {
          this.actions.toggleIdle();
        }
      },
      startTimer: () => {
        const TaskID = this.currentTask();
        let taskRows: HTMLCollectionOf<Element> = document.getElementsByClassName('task-row');
        const taskRow: Element = document.getElementById(TaskID);
        let _self = this;
        let taskIndex: String = this.actions.getTask(TaskID);
        let viewModelMainTask = this.viewModel.tasks().find(task => task.index === taskIndex);
        let overallTimerElement = taskRow.querySelector('.task-over-time');
        viewModelMainTask.observables.startBtn(false);
        viewModelMainTask.observables.stopBtn(false);
        viewModelMainTask.observables.pauseBtn(true);

        let timerElement = taskRow.querySelector('.task-time');
        clearInterval(this.interval);
        for (var i = 0; i < taskRows.length; ++i) {
          if (taskRows[i].id === TaskID) {
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
            const taskParentIndex = _self.actions.getTask(viewModelMainTask.parent.id());
            const viewModelParentTask = _self.viewModel.tasks().find(task => task.index === taskParentIndex);
            let overallTimerParentElement = document.getElementById(viewModelMainTask.parent.id()).querySelector('.task-over-time');
            viewModelParentTask.overall.clean++;
            viewModelParentTask.overall.formatted = moment.utc(viewModelParentTask.overall.clean * 1000).format('HH:mm:ss');
            overallTimerParentElement.innerHTML = viewModelParentTask.overall.formatted;
            _self.actions.updateTask(viewModelMainTask.parent.id(), viewModelParentTask);
          }
          overallTimerElement.innerHTML = viewModelMainTask.overall.formatted;
          timerElement.innerHTML = viewModelMainTask.time.formatted;
          _self.actions.updateTask(TaskID, viewModelMainTask);
        }, 1000);

      }
    };
    /*
    
        updateSortOrder() {
          const _self = this;
          this.viewModel.tasks().forEach(function(v, index) {
            if (v.parent.id() !== '') {
              let parentIndex: String = _self.getTask(v.parent.id());
              let viewModelParentTask = _self.viewModel.tasks().find(task => task.index === parentIndex);
              v.sortOrder(viewModelParentTask.sortOrder());
              _self.viewModel.tasks().sort((a, b) => a.sortOrder() < b.sortOrder() ? -1 : a.sortOrder() > b.sortOrder() ? 1 : 0);
              for (var i = 0; i < _self.viewModel.tasks().length; ++i) {
                _self.viewModel.tasks()[i].sortOrder(i);
              }
            }
          });
        }
    
    */

    constructor() {
      this.actions.setMeta();
      this.actions.versionCheck();
    }

  }
}

addEvent('DOMContentLoaded', function() {
  var application = new noirtime.Tasks();

});
