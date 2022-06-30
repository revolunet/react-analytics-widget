# react-analytics-widget

[![npm package][npm-badge]][npm]

Embed Google Analytics widgets in your React applications.

 - The `GoogleProvider` container ensure user is logged on analytics
 - The `GoogleDataChart` component display any [DataChart configuration](https://developers.google.com/analytics/devguides/reporting/embed/v1/component-reference#datachart)
 - The `GoogleDataRT` component display any [RealTime](https://developers.google.com/analytics/devguides/reporting/realtime/dimsmets/) data


![](./demo.png)

Demo : [https://revolunet.github.io/react-analytics-widget](https://revolunet.github.io/react-analytics-widget)

## Requirements

You need to create a OAUTH client id in the [google developer console](https://console.developers.google.com/apis/credentials/oauthclient/960315238073-dv345fcj3tkikn506k9lrch73hk9259u.apps.googleusercontent.com?project=eastern-store-174123) and provide an [analytic view ID](https://ga-dev-tools.appspot.com/query-explorer/).
Alternatively you can use server-side authentication tokens. You can find more info in this [example](https://ga-dev-tools.appspot.com/embed-api/server-side-authorization/).

### Note:
If you provide values for both the `accessToken` and the `clientId` props, the latter will be ignored.

Also, add the Google SDK at the top of your page

```js
;(function(w, d, s, g, js, fjs) {
  g = w.gapi || (w.gapi = {})
  g.analytics = {
    q: [],
    ready: function(cb) {
      this.q.push(cb)
    }
  }
  js = d.createElement(s)
  fjs = d.getElementsByTagName(s)[0]
  js.src = "https://apis.google.com/js/platform.js"
  fjs.parentNode.insertBefore(js, fjs)
  js.onload = function() {
    g.load("analytics")
  }
})(window, document, "script")

```

## Usage
### Customizable props
You can pass props to customize the visualizations.
#### Data configuration
```js
// Last 30 days analytics
const last30days = {
  query: {
    dimensions: "ga:date",
    metrics: "ga:pageviews",
    "start-date": "30daysAgo",
    "end-date": "yesterday"
  },
  chart: {
    type: "LINE", // Possible options are: LINE, COLUMN, BAR, TABLE, and GEO.
    options: {
      // options for google charts
      // https://google-developers.appspot.com/chart/interactive/docs/gallery
      title: "Last 30 days pageviews"
    }
  }
};

// Active users in real time
const activeUsers = {
  pollingInterval: 5, // 5 seconds minimum
  options: {
    title: 'Active users'
  },
  query: {
    metrics: 'rt:activeUsers'
  }
};

// ...
<GoogleDataChart config={last30days} ... />
<GoogleDataRt config={activeUsers} ... />
// ...
```

#### Views
```js
// analytics views ID
const views = {
  query: {
    ids: "ga:87986986"
  }
};
// ...
<GoogleDataChart views={views} ... />
<GoogleDataRT views={views} ... />
// ...
```

#### Loader
```js
// By default a css spinner is displayed
// Set false to disable
const loader = '<span>Loading...</span>';
// ...
<GoogleDataChart loader={loader} ... />
<GoogleDataRT loader={loader} ... />
// ...
```

#### Errors
```js
// By default the errors are hidden (quota, bad view id,
// insufficient permissions, missing or wrong parameters, etc)
// ...
const errors = true;
<GoogleDataRT errors={errors} ... />
// ...
```

#### Custom output (only in GoogleDataRT)
```js
/**
 * RealTime data is not supported by the official DataChart Analytics API,
 * so we have to make custom visualizations.
 * 
 * The values returned by the api can be a unique total number (active users),
 * or multiples values/columns (activeUsers by browser, for example) that must be displayed as
 * a table or chart.
 * 
 * By default the data is displayed simply as a number (or a table, depending
 * on each case), but you can customize the output using this prop.
 * 
 * Even, if you want, you can configure to use Google Charts:
 * (https://developers.google.com/chart/interactive/docs/quick_start)
 * 
 * @param {object} realTimeData Google Api response
 * @param {array}  realTimeData.columnHeaders Name of the columns returned
 * @param {string} realTimeData.ids
 * @param {string} realTimeData.kind
 * @param {object} realTimeData.profileInfo
 * @param {string} realTimeData.query
 * @param {array}  [realTimeData.rows] Rows if there are results
 * @param {string} realTimeData.selfLink
 * @param {number} realTimeData.totalResults Total count
 * @param {object} realTimeData.totalsForAllResults
 * @param {HTMLElement} node Widget container
 * @returns {Component}
 */
 const customOutput = (realTimeData, node) => { 
  // console.log(realTimeData);
  return (
    <div className="my-custom-visualization">
    ...
    </div>
  ) 
};
// ...
<GoogleDataRT customOutput={customOutput} ... />
// ...
```

#### UserInfoLabel
```js
// If you are using OAUTH client id, this is the text to display before the logged in
// user's email address. Defaults to 'You are logged in as: '.
// ...
const userInfoLabel = 'Has iniciado sesión como: ';
<GoogleProvider userInfoLabel={userInfoLabel} ... />
// ...
```

### CSS
The css component is a minimal style to allows some basic functions in the interface.

```js
import 'react-analytics-widget/css/base.css';
// or
import 'react-analytics-widget/css/src/base.sass';

```

### OAUTH authentication

```js
import { GoogleProvider, GoogleDataChart, GoogleDataRT } from 'react-analytics-widget';
import 'react-analytics-widget/css/base.css';

const CLIENT_ID = 'x-x--x---x---x-xx--x-apps.googleusercontent.com';

// graph 1 config
const last30days = {
  query: {
    dimensions: "ga:date",
    metrics: "ga:pageviews",
    "start-date": "30daysAgo",
    "end-date": "yesterday"
  },
  chart: {
    type: "LINE",
    options: {
      // options for google charts
      // https://google-developers.appspot.com/chart/interactive/docs/gallery
      title: "Last 30 days pageviews"
    }
  }
};

// graph 2 config
const realTimeBrowsers = {
  pollingInterval: 1000,
  options: {
    title: "Realtime browsers"
  },
  query: {
    metrics: 'rt:activeUsers',
    dimensions: 'rt:browser'
  }
};

// analytics views ID
const views = {
  query: {
    ids: "ga:87986986"
  }
};

const Example = () => (
  <GoogleProvider clientId={CLIENT_ID}>
    <GoogleDataChart views={views} config={last30days} />
    <GoogleDataRT views={views} config={realTimeBrowsers} />
  </GoogleProvider>
)
```

### Server-side token authentication

```js
import React, { Component } from 'react';
import { GoogleProvider, GoogleDataChart, GoogleDataRT } from 'react-analytics-widget';
import 'react-analytics-widget/css/base.css';

// graph 1 config
const last7days = {
  query: {
    dimensions: "ga:date",
    metrics: "ga:pageviews",
    "start-date": "7daysAgo",
    "end-date": "yesterday"
  },
  chart: {
    type: "LINE"
  }
};

// graph 2 config
const realTimeBrowsers = {
  pollingInterval: 1000,
  options: {
    title: "Realtime browsers"
  },
  query: {
    metrics: 'rt:activeUsers',
    dimensions: 'rt:browser'
  }
};

// analytics views ID
const views = {
  query: {
    ids: "ga:87986986"
  }
};

class Example extends Component {

  componentDidMount = () => {

    const getToken = async () => {

      try {
        const request = new Request('https://yourserver.example/auth/ganalytics/getToken', {
          method: 'GET'
        });
    
        let response = await fetch(request);
        const { token } = await response.json(); 

        if (!token) throw new Error ('Token not found');

        this.setState({ token });
    
      } catch (err) {
        console.error(err)
      }
    }

    getToken();

    // The tokens expires every 60 minutos, so refresh every 50
    setInterval(() => getToken(), 1000 * 60 * 50);

  };

  render = () => (
      
    (this.state.token) &&
      <GoogleProvider accessToken={this.state.token}>
        <GoogleDataChart views={views} config={last7days} />
        <GoogleDataRT views={views} config={realTimeBrowsers} />
      </GoogleProvider>
            
  )
};
```

[npm-badge]: https://img.shields.io/npm/v/react-analytics-widget.png?style=flat-square
[npm]: https://www.npmjs.org/package/react-analytics-widget
