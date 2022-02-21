'use strict';

const ora = require('ora');
const rm = require('rimraf');
const chalk = require('chalk');

const path = require('path');
const Command = require('common-bin');
const helper = require('./lib/helper');

class EggBuild extends Command {
    constructor(rawArgv) {
        super(rawArgv);
        this.usage = 'Usage: egg-build [options]';

        this.options = {
            baseDir: {
                alias: 'b',
                description: 'the target directory',
                coerce: str => path.resolve(process.cwd(), str),
            },
        };

        // custom helper
        Object.assign(this.helper, helper);
    }

    * run({ cwd, argv }) {
        argv.baseDir = argv.baseDir || cwd;
        // console.log('run default command at %s', argv.baseDir);
        yield this.package(argv.baseDir);
    }

    get description() {
        return 'Generate Eggjs format deploy package automatically';
    }

    * package(baseDir) {
        process.env.NODE_ENV = 'production';
        const config = require('./build.config.json');
        // console.log(config);

        const spinner = ora('building for production...');
        spinner.start();

        rm.sync(path.join(baseDir, config.target));

        const ignores = config.ignore || [];
        const files = yield this.helper.getFileList(baseDir, ignores);
        const reg = new RegExp(config.test);
        const buildStat = {
            transform: 0,
            copy: 0,
        };
        files.map(file => {
            if (reg.test(file.name)) {
                // console.log(`transform ${file.name}`);
                buildStat.transform += 1;
                this.helper.transformSync(
                    path.join(file.root, file.name),
                    path.join(baseDir, config.target, file.relative, file.name),
                    config
                );
            } else {
                // console.log(`copy ${file.name}`);
                buildStat.copy += 1;
                this.helper.copyFileSync(
                    path.join(file.root, file.name),
                    path.join(baseDir, config.target, file.relative, file.name),
                );
            }
        })

        //symlink node_modules
        this.helper.symlinkSync(path.join(baseDir, "node_modules"), path.join(baseDir, config.target, "node_modules"));

        spinner.stop();

        console.log(`Copy ${chalk.redBright(buildStat.copy)} files, transform ${chalk.redBright(buildStat.transform)} files.\n`);
        console.log(chalk.cyan('  Build complete.\n'));

    }
}

module.exports = EggBuild;
