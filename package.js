Package.describe({
  name: 'lukemadera:video-capture',
  version: '1.0.0',
  // Brief, one-line summary of the package.
  summary: 'Record video from user browser or device, cross platform (Web, Cordova)',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/lukemadera/meteor-video-capture',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');

  api.use('templating@1.0.0');
  api.use('blaze@2.0.0');
  api.use('reactive-var@1.0.5');

  // api.use(['cordova:org.apache.cordova.media-capture@0.3.6'], 'client');

  // api.use(['cosmos:browserify@0.9.2'], 'client');
  // Npm.depends({
  //   // 'recordrtc': '5.2.4'
  //   'webrtc-adapter-test': '0.2.5'
  // });

  Cordova.depends({
    'org.apache.cordova.media-capture': '1.1.0'
    // 'org.apache.cordova.media-capture': '0.3.6'
  });

  api.addFiles([
    // 'client.browserify.js',
    'video-capture.html',
    'video-capture.css',
  ], 'client');
  api.addFiles([
    'video-capture.js'
  ]);

  api.export('lmVideoCapture');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('lukemadera:video-capture');
  api.addFiles('video-capture-tests.js');
});
