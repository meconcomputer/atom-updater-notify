'use babel';

import { CompositeDisposable } from 'atom';
import * as https from 'https';
import {Updater} from './updater';
import {Timer} from './timer';
import {Notify} from './notify';

let main = {

  config: {
    acceptTestVersion: {
      'type': 'boolean',
      'default': false,
      'title': 'Accept test versions of atom.',
      'description': 'You can accept test versions of atom.'
    },
    checkInterval: {
      'type': 'integer',
      'default': 1,
      'title': 'Check interval',
      'description': 'Interval to check new versions of atom in repository, in hours.'
    },
    pkgType: {
      'type': 'string',
      'default': 'Debian, Ubuntu',
      'title': 'Package type',
      'enum': [
        'Debian, Ubuntu',
        'RedHat',
        'Mac OSX'
      ],
      'description': 'The type of package for download.'
    }
  },

  updaterNotifyView: null,
  modalPanel: null,
  subscriptions: null,
  timer: null,

  checkInterval() {
    var period = atom.config.get('updater-notify.checkInterval', 1);

    if(period < 1) period = 1;

    return (period * 60 * 60) * 1000;
  },

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'updater-notify:manualCheck': () => this.manualCheck()
    }));

    atom.config.onDidChange('updater-notify.acceptTestVersion', (values) => {
      this.timer.stop();
      this.timer.start();
    });

    atom.config.onDidChange('updater-notify.pkgType', (values) => {
      this.timer.stop();
      this.timer.start();
    });

    atom.config.onDidChange('updater-notify.checkInterval', (values) => {
      this.timer.interval = this.checkInterval();
    });

    if(!this.timer) {
      var me = this;

      this.timer = new Timer(
        () => {
          me.automaticChecker();
        },
        false,
        false,
        this.checkInterval()
      );
    }

    this.timer.start();
  },

  consumeStatusBar(statusBar) {
    this.statusBar = statusBar;

    this.statusDisplay = new Notify();

    this.subscriptions.add(this.statusDisplay);

    this.statusBar = statusBar.addRightTile({
      item: this.statusDisplay,
      priority: -1
    });
  },

  deactivate() {
    this.subscriptions.dispose();
    this.statusBar.destroy();
    this.timer.stop();
  },

  serialize() {
    return {
    };
  },

  automaticChecker() {
    let up = new Updater();
    var pkgType = '.zip';

    if(atom.config.get('updater-notify.pkgType') === 'Debian, Ubuntu')
      pkgType = '.deb';
    else if(atom.config.get('updater-notify.pkgType') === 'RedHat')
      pkgType = '.rpm';
    else if(atom.config.get('updater-notify.pkgType') === 'Mac OSX')
      pkgType = '.nupkg';

    up.checkUpdate().then(
      (info) => {
        if(info) {
          this.statusDisplay.content(info);
          atom.notifications.addInfo(
            [
              '<h2>A new version of Atom is available</h2>',
              '<p>Latest version: <a href="' + info.html_url + '">' + info.name + '</a></p>',
              '<div>',
                '<ul>',
                info.assets.map((asset) => {
                  if(asset.name.indexOf(pkgType) >= 0)
                    return '<li><a href="' + asset.browser_download_url+ '">' + asset.name + '</a></li>';
                  else
                    return '';
                }).join(''),
                '</ul>',
              '</div>',
              '<p>Update Atom using the links above.</p>',
            ].join('')
          );
        }
        else
          this.statusDisplay.hide();
      },
      (message) => {
        atom.notifications.addError(message);
      }
    );
  },

  manualCheck() {
    let up = new Updater();

    up.checkUpdate().then(
      (info) => {
        if(info) {
          atom.notifications.addInfo(
            [
              '<p>A new version of Atom is available</p>',
              '<p>Latest Version: <a href="' + info.html_url + '">' + info.name + '</a></p>'
            ].join('')
          );
        }
        else
          atom.notifications.addInfo('No new updates were found at this time.');
      },
      (message) => {
        atom.notifications.addError(message);
      }
    );
  }
};

export default main;
