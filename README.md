# lukemadera:video-capture

Record video from user browser or device, cross platform (Web, Cordova).


## Demo

[Demo](http://lukemadera-packages.meteor.com/video-capture-basic)

[Source](https://github.com/lukemadera/meteor-packages/tree/master/video-capture/basic)


## Dependencies

[none]


## Installation

In a Meteor app directory:
```bash
meteor add lukemadera:video-capture
```


## Usage

```html
{{> lmVideoCapture opts=opts}}
```

```js
if(Meteor.isClient) {
  Template.videoCaptureBasic.helpers({
    opts: function() {
      var opts ={
        // maxTime: 15,
        // androidQuality: 0,
        // videoDisplay: {
        //   width: 600,
        //   height: 460
        // },
        // classes: {
        //   recordBtn: 'video-capture-basic-record-btn',
        //   stopBtn: 'video-capture-basic-stop-btn'
        // },
        onVideoRecorded: function(err, base64Data) {
          console.log('onVideoRecorded');
        }
      };
      return opts;
    }
  });
}
```

Then do whatever you want (e.g. save to Amazon S3) with the `base64Data` that is returned in the `onVideoRecorded` callback.
