import * as util from '../utils/index';

export function newTask( idx: string, inx: number, title: string, isSticky: boolean ) {
	return {
        id: idx,
        index: inx,
        name: title,
        sticky: isSticky,
        child: util.base.ko.observable(false),
        parent: {
          id: util.base.ko.observable(''),
          name: util.base.ko.observable('')
        },
        time: {
          clean: 0,
          formatted: util.base.moment.utc(0).format('HH:mm:ss')
        },
        overall: {
          clean: 0,
          formatted: util.base.moment.utc(0).format('HH:mm:ss')
        },
        observables: {
          startBtn: util.base.ko.observable(true),
          pauseBtn: util.base.ko.observable(false),
          stopBtn: util.base.ko.observable(false)
        }
      };

}