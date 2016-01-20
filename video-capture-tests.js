Tinytest.add('subtractOneSecond with 1 second left', function (test) {
  var data ={
    hours: 0,
    minutes: 0,
    seconds: 1
  };
  var newData =lmVideoCapture.subtractOneSecond(data);
  test.equal(newData.hours, 0);
  test.equal(newData.minutes, 0);
  test.equal(newData.seconds, 0);
  test.equal(newData.display, '00');
});

Tinytest.add('subtractOneSecond with 0 seconds left', function (test) {
  var data ={
    hours: 0,
    minutes: 0,
    seconds: 0
  };
  var newData =lmVideoCapture.subtractOneSecond(data);
  test.equal(newData.hours, 0);
  test.equal(newData.minutes, 0);
  test.equal(newData.seconds, 0);
  test.equal(newData.display, '00');
});

Tinytest.add('subtractOneSecond with 01:10:05 left', function (test) {
  var data ={
    hours: 1,
    minutes: 10,
    seconds: 5
  };
  var newData =lmVideoCapture.subtractOneSecond(data);
  test.equal(newData.hours, 1);
  test.equal(newData.minutes, 10);
  test.equal(newData.seconds, 4);
  test.equal(newData.display, '01:10:04');
});

Tinytest.add('subtractOneSecond with 01:10:00 left', function (test) {
  var data ={
    hours: 1,
    minutes: 10,
    seconds: 0
  };
  var newData =lmVideoCapture.subtractOneSecond(data);
  test.equal(newData.hours, 1);
  test.equal(newData.minutes, 9);
  test.equal(newData.seconds, 59);
  test.equal(newData.display, '01:09:59');
});

Tinytest.add('subtractOneSecond with 01:00:00 left', function (test) {
  var data ={
    hours: 1,
    minutes: 0,
    seconds: 0
  };
  var newData =lmVideoCapture.subtractOneSecond(data);
  test.equal(newData.hours, 0);
  test.equal(newData.minutes, 59);
  test.equal(newData.seconds, 59);
  test.equal(newData.display, '59:59');
});
