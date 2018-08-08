import {base} from '../utils/index';

let model = {
    tasks: base.ko.observableArray(),
    count: base.ko.observable(0),
    showNoResults: base.ko.observable(false),
    date: '',
    time: {
        clean: 0,
        formatted: base.moment.utc(0).format('HH:mm:ss')
    },
    overall: {
        clean: 0,
        formatted: base.moment.utc(0).format('HH:mm:ss')
    }
}

export default model;