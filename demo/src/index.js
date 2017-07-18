import React, { Component } from "react"
import { render } from "react-dom"
import GithubCorner from 'react-github-corner';

import { GoogleProvider, GoogleDataChart } from "../../src"

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

const CHARTS = [
  {
    reportType: "ga",
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
    reportType: "ga",
    query: {
      dimensions: "ga:date",
      metrics: "ga:sessions",
      "start-date": "30daysAgo",
      "end-date": "yesterday"
    },
    chart: {
      type: "LINE",
      options: {
        title: "Last 30 days sessions",
        width: '100%'
      }
    }
  },
  {
    reportType: "ga",
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
    reportType: "ga",
    query: {
      dimensions: "ga:date",
      metrics: "ga:goalCompletionsAll",
      "start-date": "30daysAgo",
      "end-date": "yesterday"
    },
    chart: {
      type: "LINE",
      options: {
        title: "Last 30 days conversions",
        width: '100%'
      }
    }
  }
]

// App credential in the google developer console
var CLIENT_ID = "960315238073-dv345fcj3tkikn506k9lrch73hk9259u.apps.googleusercontent.com"

class Example extends React.Component {
  state = {
    ids: "ga:150278027"
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
        <GoogleProvider clientId={CLIENT_ID}>
          <div style={{margin:'20px 0'}}>
            Define your view ID :
            <input type="text" onChange={e => this.setState({ ids: e.target.value })} value={this.state.ids} />
            <button onClick={() => this.forceUpdate()}>Load</button>
            <br />
          </div>
          {CHARTS.map((c, i) => <GoogleDataChart style={{display: 'inline-block', width: 350, margin:20, border: '1px solid #eee', padding: 10}} key={i} views={views} config={c} />)}
        </GoogleProvider>
      </div>
    )
  }
}

render(<Example />, document.getElementById("demo"))
