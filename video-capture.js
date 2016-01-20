/**
Some stats:

30 seconds Firefox: ~9.4 MB, video renders near instantly
30 seconds iOS Cordova: ~2.9 MB, ~5 second lag between processing & video render
30 seconds Android Cordova: ~3.3MB, ~2 second lab bewteen processing & video render
  NOTE: for Android this was ONLY after I manually set the video recording size
   to the LOWEST (320x240). Originally it was the highest and was a HUGE file
   size and would not even load at all after processing.. It does NOT seem as
   if we can alter this quality via javascript; the user must do it.

Notes: One of the tricky parts was reading the file in chunks (to prevent
 crashes for large video files) and getting them to base64. Concatenating
 multiple base64 strings together is not trivial; you must slice the pieces
 at particular parts to get the padding correct.
Thanks to Christopher Keefer for this solution.
http://artandlogic.com/2015/12/filereader-chunking-and-base64-dataurls/
*/

lmVideoCapture ={};

_videoCapture ={
  state: '',
  opts: {},
  optsDefaults: {
    maxTime: 30,
    androidQuality: 0,
    videoDisplay: {
      width: 300,
      height: 230
    },
    classes: {
      recordBtn: 'lm-video-capture-record-start-btn-style',
      stopBtn: 'lm-video-capture-record-stop-btn-style'
    }
  },
  timeouts: {
    recordTime: null,
    countdown: null
  }
};

var recorder;
var streamBuffer;

lmVideoCapture.recordStart =function(templateInst) {
  if(Meteor.isCordova) {
    _videoCapture.recordStartCordova(templateInst);
  }
  else {
    _videoCapture.recordStartBrowser(templateInst);
  }
  
};

lmVideoCapture.recordStop =function(templateInst) {
  if(Meteor.isCordova) {
    // Nothing to do - should not ever get here?
  }
  else {
    _videoCapture.recordStopBrowser();
  }
  
  clearTimeout(_videoCapture.timeouts.countdown);
  var countdownData =templateInst.countdownData.get();
  countdownData.display = null;
  templateInst.countdownData.set(countdownData);

  _videoCapture.state ='stopped';
};

/**
https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
*/
_videoCapture.getUserMedia =function() {
  var promisifiedOldGUM = function(constraints, successCallback, errorCallback) {

    // First get ahold of getUserMedia, if present
    var getUserMedia = (navigator.getUserMedia || 
   navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||
   navigator.msGetUserMedia);

    // Some browsers just don't implement it - return a rejected promise with an error
    // to keep a consistent interface
    if(!getUserMedia) {
      return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
    }

    // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
    return new Promise(function(successCallback, errorCallback) {
      getUserMedia.call(navigator, constraints, successCallback, errorCallback);
    });
      
  }

  // Older browsers might not implement mediaDevices at all, so we set an empty object first
  if(navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  // Some browsers partially implement mediaDevices. We can't just assign an object
  // with getUserMedia as it would overwrite existing properties.
  // Here, we will just add the getUserMedia property if it's missing.
  if(navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = promisifiedOldGUM;
  }
};

_videoCapture.startCountdown =function(templateInst, seconds) {
  var countdownData =templateInst.countdownData.get();
  countdownData = _videoCapture.secondsToCountdown(seconds);
  _videoCapture.countdownTimeout(templateInst, countdownData);
  templateInst.countdownData.set(countdownData);
};

_videoCapture.countdownTimeout =function(templateInst, countdownData) {
  _videoCapture.timeouts.countdown =setTimeout(function() {
    countdownData =lmVideoCapture.subtractOneSecond(countdownData);
    templateInst.countdownData.set(countdownData);
    // Run again
    if(countdownData.hours !== 0 || countdownData.minutes !== 0 ||
     countdownData.seconds !== 0) {
      _videoCapture.countdownTimeout(templateInst, countdownData);
    }
  }, 1000);
};

_videoCapture.secondsToCountdown =function(seconds) {
  var secondsPerHour =60 * 60;
  var secondsPerMinute =60;
  var hours = Math.floor( seconds / secondsPerHour );
  seconds = seconds - ( hours * secondsPerHour );
  var minutes = Math.floor( seconds / secondsPerMinute );
  seconds = seconds - ( minutes * secondsPerMinute );
  return {
    hours: hours,
    minutes: minutes,
    seconds: seconds
  };
};

_videoCapture.countdownDisplay =function(countdownData) {
  var hours = countdownData.hours;
  var minutes = countdownData.minutes;
  var seconds = countdownData.seconds;
  var hoursDisplay = _videoCapture.numberToTwoDigits(hours);
  var minutesDisplay = _videoCapture.numberToTwoDigits(minutes);
  var secondsDisplay = _videoCapture.numberToTwoDigits(seconds);
  return hours ? ( hoursDisplay + ":" + minutesDisplay + ":" + secondsDisplay )
   : minutes ? ( minutesDisplay + ":" + secondsDisplay )
   : secondsDisplay;
};

_videoCapture.numberToTwoDigits =function(number) {
  return ( number.toString().length < 2 ) ? ( "0" + number.toString() ) : number.toString();
};

lmVideoCapture.subtractOneSecond =function(countdownData) {
  if( countdownData.hours === 0 && countdownData.minutes === 0 &&
   countdownData.seconds <= 1 ) {
    countdownData.seconds =0;
  }
  else {
    if(countdownData.seconds !== 0) {
      countdownData.seconds--;
    }
    else {
      countdownData.seconds =59;
      if(countdownData.minutes !== 0) {
        countdownData.minutes--;
      }
      else {
        countdownData.minutes =59;
        if(countdownData.hours !== 0) {
          countdownData.hours--;
        }
        else {
          countdownData.hours =23;
        }
      }
    }
  }
  
  countdownData.display =_videoCapture.countdownDisplay(countdownData);
  return countdownData;
};

_videoCapture.showVideo =function(videoUrl) {
  var video = document.querySelector('video');
  video.src = videoUrl;
  if(_videoCapture.opts.onVideoRecorded) {
    _videoCapture.opts.onVideoRecorded(null, videoUrl);
  }
};

_videoCapture.recordStartCordova =function(templateInst) {
  var constraints ={
    limit: 1,
    duration: _videoCapture.opts.maxTime,
    quality: _videoCapture.opts.androidQuality
  };

  var captureSuccess =function(mediaFiles) {
    lmVideoCapture.recordStop(templateInst);
    var mediaFile = mediaFiles && mediaFiles[0] || null;
    if(mediaFile) {
      templateInst.processing.set(true);
      _videoCapture.fileToDataUrl(mediaFile, function(videoUrl) {
        templateInst.processing.set(false);
        _videoCapture.showVideo(videoUrl);
      });
    }
  };

  navigator.device.capture.captureVideo(captureSuccess, function(err) {
    lmVideoCapture.recordStop(templateInst);
    console.error(err);
  }, constraints);

  _videoCapture.startCountdown(templateInst, _videoCapture.opts.maxTime);
};

_videoCapture.recordStartBrowser =function(templateInst) {
  var constraints ={
    audio: true,
    // video: true,
    video: {
      width: 480,
      height: 360,
      frameRate: {
        // ideal: 10,
        max: 30   // Below this, only audio is prompted on Firefox
      }
    }
  };
  navigator.mediaDevices.getUserMedia(constraints)
  .then(function(stream) {
    var video = document.querySelector('video');
    video.src = window.URL.createObjectURL(stream);

    recorder = new MediaRecorder(stream);
    streamBuffer =[];
    _videoCapture.state ='started';

    // Will be called each time we get data from stream.
    recorder.ondataavailable = function(evt) {
      if(evt.data) {
        streamBuffer.push(evt.data);
        if( _videoCapture.state === 'stopped' ) {
          templateInst.processing.set(true);
          _videoCapture.bufferToDataUrl(streamBuffer, function(videoUrl) {
            templateInst.processing.set(false);
            _videoCapture.showVideo(videoUrl);
          });
        }
      }
    };
    recorder.start();

    _videoCapture.startCountdown(templateInst, _videoCapture.opts.maxTime);

    // Set timeout to auto stop after max time.
    _videoCapture.timeouts.recordTime =setTimeout(function() {
      if( _videoCapture.state === 'started' ) {
        lmVideoCapture.recordStop(templateInst);
      }
    }, ( _videoCapture.opts.maxTime * 1000 ) );

  })
  .catch(function(err) {
    console.error(err);
  });
};

/**
https://github.com/SaneMethod/HUp/blob/master/hup.js#L307

Convenience function for the reassembly of a file read in chunks as a data
 url, and returns a single dataURL base64 encoded string.
*/
_videoCapture.reassembleChunkedDataURL =function(parts) {
  var dataURL;

  dataURL = parts[0];
  for (var i=1, len=parts.length; i < len; i++) {
    dataURL += parts[i].split(',')[1];
  }
  return dataURL;
};

/**
http://artandlogic.com/2015/12/filereader-chunking-and-base64-dataurls/

Calculate what the value of this.end should be when the file read is chunked, as special handling is needed
when we're using the 'readAsDataURL' read_method to align reads on multiples of 6, as a result of how base64
encoding works (that is, each character encodes 6 bits of information - if we fail to align the chunks with a
multiple of 6, the base64 beyond the first chunk will end up represented in a way that cannot be trivially
combined with the initial chunk).
*/
_videoCapture.calculateChunkEnd = function(start, chunkSize, fileSize) {
  var end = Math.min( ( start + chunkSize ), fileSize);
  if (end !== fileSize) {
    end -= end % 6;
  }
  return end;
};


/**
http://stackoverflow.com/questions/24647563/reading-line-by-line-file-in-javascript-on-client-side
http://dojo4.com/blog/processing-huge-files-with-an-html5-file-input
*/
_videoCapture.readFileChunksToBase64 =function(file, fileType, callback) {
  // var reader = new FileReader();
  
  var reader;
  var fileSize = file.size;
  var chunkSize = 100 * 1024;   // 100 kb
  var base64Chunks =[];
  // var offset = 0;
  var start =0;
  var end;
  var blob, chunk;
  
  var saveChunk = function(evt) {
    if (evt.target.error) {
      console.error(evt.target.error);
    }
    else {
      base64Chunks.push(evt.target.result);
    }
    if( end < fileSize ) {
      start =end;
      readChunk(file);
    }
    else {
      console.info('~' + ( base64Chunks.length / 10 ) + 'MB - ' + base64Chunks.length + ' (100 kb) chunks');
      var content =_videoCapture.reassembleChunkedDataURL(base64Chunks);
      callback(content);
    }
  };

  var readChunk = function (file) {
    end = ( ( start + chunkSize ) >= fileSize ) ? fileSize : ( start + chunkSize );
    end =_videoCapture.calculateChunkEnd(start, chunkSize, fileSize);
    blob = file.slice(start, end, fileType);
    reader = new FileReader();
    reader.onload =saveChunk;
    reader.readAsDataURL(blob);
  };

  readChunk(file);
};

/**
http://stackoverflow.com/questions/26733070/cordova-capture-video-and-retrieve-base64-data
*/
_videoCapture.fileToDataUrl =function(file, callback) {

  file = new window.File(file.name, file.localURL, file.type,
   file.lastModifiedDate, file.size);
  
  // Need to read in chunks to prevent crash for big files.
  // var reader = new FileReader();
  // reader.onload = function (readerEvt) {
  //   callback(readerEvt.target.result);
  // };
  // reader.readAsDataURL(file);

  _videoCapture.readFileChunksToBase64(file, file.type, callback);
};

_videoCapture.bufferToDataUrl =function(buffer, callback) {
  var fileType ='video/webm';
  var blob = new Blob(buffer, {
    type: fileType
  });

  // Read in chunks to prevent crash for big files.
  // var reader = new FileReader();
  // reader.onload = function() {
  //   callback(reader.result);
  // };
  // reader.readAsDataURL(blob);

  _videoCapture.readFileChunksToBase64(blob, fileType, callback);
}

_videoCapture.recordStopBrowser =function() {
  clearTimeout(_videoCapture.timeouts.recordTime);
  recorder.stop();
  recorder.stream.getTracks().forEach(function(track) {
    track.stop();
  });
};

_videoCapture.getPlatform =function() {
  return {
    ios: /iPhone|iPad|iPod/i.test(navigator.userAgent),
    android: /Android/i.test(navigator.userAgent),
    blackberry: /BlackBerry/i.test(navigator.userAgent),
    windows: /IEMobile/i.test(navigator.userAgent),
    // http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
    firefox: typeof InstallTrigger !== 'undefined'
  };
};

_videoCapture.platformSupport =function() {
  var platform =_videoCapture.getPlatform();
  var ret ={
    supported: ( ( Meteor.isCordova && ( platform.android || platform.ios ) )
     || platform.firefox ) ? true : false,
    message: null
  };
  if( Meteor.isCordova && platform.android ) {
    ret.message =
     "Make sure to reduce the video recording settings to the" +
     " LOWEST quality (e.g. the smallest dimensions - 320 x 240)" +
     " otherwise the file size will be too large and the video will" +
     " not load after the recording.";
  }
  else if( !ret.supported) {
    ret.message =
     "Video capture is only supported on Firefox, Android and iOS. Chrome coming soon.";
  }
  return ret;
};

_videoCapture.init =function(templateInst) {
  if(!templateInst.inited) {
    _videoCapture.opts =templateInst.data && templateInst.data.opts || {};
    var key;
    for(key in _videoCapture.optsDefaults) {
      if(_videoCapture.opts[key] === undefined) {
        _videoCapture.opts[key] =_videoCapture.optsDefaults[key];
      }
    }
    if(!Meteor.isCordova) {
      _videoCapture.getUserMedia();
    }
    templateInst.inited =true;
  }
};

if(Meteor.isClient) {

  Template.lmVideoCapture.created =function() {
    this.countdownData = new ReactiveVar({
      hours: 0,
      minutes: 0,
      seconds: 0,
      display: null
    });
    this.processing = new ReactiveVar(false);
    this.inited =false;
  };

  // Template.lmVideoCapture.rendered =function() {
    
  // };

  Template.lmVideoCapture.helpers({
    data: function() {
      var templateInst =Template.instance();
      _videoCapture.init(templateInst);
      return {
        countdownTimer: templateInst.countdownData.get().display,
        processing: templateInst.processing.get(),
        showStopButton: Meteor.isCordova ? false : true,
        videoDisplay: _videoCapture.opts.videoDisplay,
        classes: _videoCapture.opts.classes,
        platformSupport: _videoCapture.platformSupport()
      };
    }
  });

  Template.lmVideoCapture.events({
    'click .lm-video-capture-record-start-btn': function(evt, template) {
      lmVideoCapture.recordStart(template);
    },
    'click .lm-video-capture-record-stop-btn': function(evt, template) {
      lmVideoCapture.recordStop(template);
    }
  });

}