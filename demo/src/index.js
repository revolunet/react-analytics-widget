import React from "react"
import { render } from "react-dom"
import GithubCorner from 'react-github-corner';

import { GoogleProvider, GoogleDataChart, GoogleDataRT } from "../../src"

  ; (function (w, d, s, g, js, fs) {
    g = w.gapi || (w.gapi = {}); g.analytics = { q: [], ready: function (f) { this.q.push(f); } };
    js = d.createElement(s); fs = d.getElementsByTagName(s)[0];
    js.src = 'https://apis.google.com/js/platform.js';
    fs.parentNode.insertBefore(js, fs); js.onload = function () { g.load('analytics'); };
  }(window, document, 'script'));

const CHARTS = [
  {
    query: {
      dimensions: "ga:date",
      metrics: "ga:sessions",
      "start-date": "10daysAgo",
      "end-date": "yesterday"
    },
    chart: {
      type: "LINE",
      options: {
        title: "Last 10 days sessions",
        width: '100%'
      }
    }
  },
  {
    query: {
      dimensions: "ga:date",
      metrics: "ga:pageviews",
      "start-date": "30daysAgo",
      "end-date": "yesterday"
    },
    chart: {
      type: "LINE",
      options: {
        title: "Last 30 days pageviews",
        width: '100%'
      }
    }
  },
  {
    query: {
      dimensions: "ga:browser",
      metrics: "ga:sessions",
      "start-date": "30daysAgo",
      "end-date": "yesterday",
      sort: '-ga:sessions'
    },
    chart: {
      type: "PIE",
      options: {
        title: "Last 30 days sessions",
        width: '100%'
      }
    }
  },
  {
    query: {
      metrics: 'ga:sessions',
      dimensions: 'ga:browser'
    },
    chart: {
      type: 'TABLE',
      options: {
        title: "Last 30 days conversions",
        width: '100%'
      }
    }
  }
]

const REAL_TIME = [
  {
    pollingInterval: 10,
    options: {
      title: "Realtime browsers"
    },
    query: {
      metrics: 'rt:activeUsers',
      dimensions: 'rt:browser'
    }
  },
  {
    pollingInterval: 10,
    options: {
      title: "Active users"
    },
    query: {
      metrics: 'rt:activeUsers'
    }
  },
  {
    pollingInterval: 10,
    options: {
      title: "User Types (custom output)"
    },
    query: {
      metrics: 'rt:activeUsers',
      dimensions: 'rt:userType'
    }
  }
]

const customOutput = (realTimeData) => {
  return (
    <div>
      <pre>{(realTimeData.columnHeaders) ? JSON.stringify(realTimeData.columnHeaders,  undefined, 2) : 'No results'}</pre>
      <pre>{(realTimeData.rows) ? JSON.stringify(realTimeData.rows, undefined, 2) : 'No results'}</pre>
    </div>
  )
}

class Example extends React.Component {
  state = {
    // ids: "ga:240796016" 
    ids: "ga:210653791"
  }

  componentDidMount = () => {
    const request = new Request('http://localhost/api/google_auth', {
      method: 'GET',
      credentials: 'include'
    });
    fetch(request)
      .then(response => response.json())
      .then(({ token }) => {
        this.setState({ token }); // TODO: handle errors
      })
      .catch(err => {
        console.error(err)
      })
  }

  render() {
    const views = {
      query: {
        ids: this.state.ids
      }
    }
    return (
      <div>
        <GithubCorner href="https://github.com/revolunet/react-analytics-widget" />
        <GoogleProvider accessToken={this.state.token}>
          <div style={{ margin: '20px 0' }}>
            Define your view ID :
            <input type="text" onChange={e => this.setState({ ids: e.target.value })} value={this.state.ids} />
            <button onClick={() => this.forceUpdate()}>Load</button>
            <br />
          </div>
          <div>
            {CHARTS.map((c, i) => <GoogleDataChart style={{ verticalAlign: 'top', display: 'inline-block', width: 350, margin: 20, border: '1px solid #eee', padding: 10 }} key={i} views={views} config={c} errors={true} />)}
          </div>
          <div>
            <GoogleDataRT style={{ verticalAlign: 'top', display: 'inline-block', margin: 20, border: '1px solid #eee', padding: 10 }} views={views} config={REAL_TIME[0]} errors={true} />
            <GoogleDataRT style={{ textAlign: 'center', backgroundColor: '#058dc7', color: '#fff', verticalAlign: 'top', display: 'inline-block', margin: 20, border: '1px solid #eee', padding: 10 }} views={views} config={REAL_TIME[1]} errors={true} />
            <GoogleDataRT customOutput={customOutput} style={{ backgroundColor: '#f8f8f8', width: 250, overflow: 'hidden', wordBreak: 'break-all', verticalAlign: 'top', display: 'inline-block', margin: 20, border: '1px solid #eee', padding: 10 }} views={views} config={REAL_TIME[2]} errors={true} />
          </div>
        </GoogleProvider>
      </div>
    )
  }
}

render(<Example />, document.getElementById("demo"))
