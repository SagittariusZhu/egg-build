'use strict';

const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const walk = require('walk');

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getFileList = async (baseDir, ignores) => {
    return new Promise((resolve, reject) => {
        let files = [];
        var options;
        var walker;

        options = {
            followLinks: false,
            filters: ignores,
        };

        walker = walk.walk(baseDir, options);

        walker.on("names", function (root, nodeNamesArray) {
            nodeNamesArray.sort(function (a, b) {
                if (a > b) return 1;
                if (a < b) return -1;
                return 0;
            });
        });

        walker.on("file", function (root, fileStats, next) {
            files.push({
                root,
                relative: path.relative(baseDir, root),
                name: fileStats.name
            });
            next();
        });

        walker.on("errors", function (root, nodeStatsArray, next) {
            reject(nodeStatsArray.map(stat => stat.error));
        });

        walker.on("end", function () {
            resolve(files);
        });

    });
}

const copyFileSync = (src, dest) => {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        mkdirp.sync(destDir);
    }

    fs.copyFileSync(src, dest);
}

const transformSync = (src, dest, options) => {
    const babel = require("@babel/core");
    const presets = options.babel.presets.map(name => require(name));
    const plugins = options.babel.plugins.map(name => require(name));
    const { code } = babel.transformFileSync(src, {
        presets,
        plugins,
    });

    const uglifyjs = require("uglify-js");
    const uglifyCode = uglifyjs.minify(code, options.uglify).code;

    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        mkdirp.sync(destDir);
    }
    fs.writeFileSync(dest, uglifyCode);
}

const symlinkSync = fs.symlinkSync

module.exports = {
    sleep,
    getFileList,
    copyFileSync,
    transformSync,
    symlinkSync,
};