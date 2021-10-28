const https = require('https');

const getProcessParam = (name) => {
  const valueIndex = process.argv.indexOf(name) + 1;
  return valueIndex ? process.argv[valueIndex] : null;
};

const REQUESTS_NUMBER = +getProcessParam('--requests-number') || 5000;
const PERIOD = +getProcessParam('--period') || 5 * 60 * 1000;
const URL = getProcessParam('--url') || 'https://example.com';

const updateOut = (result, { res, err }, requestNo, requestStart) => {
  const responseTime = Date.now() - requestStart;

  result.requests_proceeded += 1;

  if (res) {
    result.successful += 1;
    result.average_time_before_success = ~~(
      (result.average_time_before_success * result.successful + responseTime) /
      (result.successful + 1)
    );
  }

  if (err) {
    result.errored += 1;
    result.average_time_before_error = ~~(
      (result.average_time_before_error * result.errored + responseTime) /
      (result.errored + 1)
    );

    result.errors[err.message] = (result.errors[err.message] || 0) + 1;

    if (!result.first_failed_request_no || result.first_failed_request_no > requestNo) {
      result.first_failed_request_no = requestNo;
    }
  }

  result.average_response_time = ~~(
    (result.average_time_before_success * result.successful +
      result.average_time_before_error * result.errored) /
    (result.successful + result.errored)
  );
};

const writeOut = (outObj, start) => {
  outObj.from_start = Date.now() - start;

  console.clear();
  console.log(outObj);

  if (outObj.requests_proceeded === REQUESTS_NUMBER) {
    console.log('=== ALL REQUESTS PROCEEDED ===');
    process.exit();
  }
};

(async () => {
  const start = Date.now();

  const outObj = {
    url: URL,
    period: {
      min: ~~(PERIOD / 60000),
      sec: (PERIOD % 60000) / 1000,
    },
    from_start: 0,

    requests_number: REQUESTS_NUMBER,
    requests_proceeded: 0,
    successful: 0,
    errored: 0,

    errors: {},
    first_failed_request_no: null,

    average_response_time: 0,
    average_time_before_success: 0,
    average_time_before_error: 0,
  };

  for (let i = 1; i <= REQUESTS_NUMBER; i++) {
    setTimeout(() => {
      const requestNo = i;
      const requestStart = Date.now();

      https
        .get(URL, (res) => updateOut(outObj, { res }, requestNo, requestStart))
        .on('error', (err) => updateOut(outObj, { err }, requestNo, requestStart));
    }, (PERIOD / REQUESTS_NUMBER) * i);
  }

  setInterval(() => writeOut(outObj, start), 200);
})();
