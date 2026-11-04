'use strict';

var path = require('path');
var spawn = require('child_process').spawn;

var tasks = [
    { name: 'app_storefront_base', cwd: path.resolve(__dirname, '../../storefront-reference-architecture-master'), script: 'watch' },
    { name: 'app_custom_cartridge', cwd: path.resolve(__dirname, '..'), script: 'watch:app_custom_cartridge' },
    { name: 'mycartridge', cwd: path.resolve(__dirname, '../cartridges/mycartridge'), script: 'watch' },
    { name: 'form_custom_cartridge', cwd: path.resolve(__dirname, '../cartridges/form_custom_cartridge'), script: 'watch' }
];
var children = [];
var shuttingDown = false;

function stopAll() {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    children.forEach(function (child) {
        if (!child.killed) {
            child.kill();
        }
    });
}

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

tasks.forEach(function (task) {
    var child = spawn('npm', ['run', task.script], {
        cwd: task.cwd,
        shell: process.platform === 'win32',
        stdio: 'inherit'
    });

    children.push(child);
    child.on('error', function (error) {
        process.stderr.write('Failed to start watcher for ' + task.name + ': ' + error.message + '\n');
        process.exitCode = 1;
        stopAll();
    });
    child.on('exit', function (code) {
        if (!shuttingDown && code !== 0) {
            process.stderr.write(task.name + ' watcher exited with code ' + code + '. Stopping other watchers.\n');
            process.exitCode = code || 1;
            stopAll();
        }
    });
});
