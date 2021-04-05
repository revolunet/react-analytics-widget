import React from "react"
import { render } from "react-dom"
import GithubCorner from 'react-github-corner';

import { GoogleProvider, GoogleDataChart, GoogleDataLive } from "../../src"

  ;(function(w,d,s,g,js,fs){
    g=w.gapi||(w.gapi={});g.analytics={q:[],ready:function(f){this.q.push(f);}};
    js=d.createElement(s);fs=d.getElementsByTagName(s)[0];
    js.src='https://apis.google.com/js/platform.js';
    fs.parentNode.insertBefore(js,fs);js.onload=function(){g.load('analytics');};
  }(window,document,'script'));
  
  ;(function(d,s,js,fs){
    js = d.createElement(s);
    fs = d.getElementsByTagName(s)[0];
    js.src = "https://ga-dev-tools.appspot.com/public/javascript/embed-api/components/active-users.js";
    fs.parentNode.insertBefore(js, fs);
  }(document,'script'));

  ;(function(w,d,l,s,g,st,fs){
    st = d.createElement(l);
    fs = d.getElementsByTagName(s)[0];
    st.href = "https://ga-dev-tools.appspot.com/public/css/chartjs-visualizations.css";
    st.rel = "stylesheet";
    fs.parentNode.insertBefore(st, fs);
  }(window,document,'link','script'));  

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

const ACTIVE_USERS = {
  ids: "ga:210653791",
  pollingInterval: 5,
  template: '<div class="ActiveUsers">Usuarios activos: <b class="ActiveUsers-value"></b></div>',
  query: {
    metrics: 'rt:activeUsers'
  }
}

class Example extends React.Component {
  state = {
    ids: "ga:210653791"
  }

  componentDidMount = () => {
    const request = new Request('http://localhost/api/auth', {
      method: 'GET',
      credentials: 'include'
    });
    fetch(request)
      .then(response => response.json())
      .then(({ token }) => {
        this.setState({ token }); // TODO: handle errors
      });
  }

  render() {
    const customLoader = 'Loading...'
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
          {CHARTS.map((c, i) => <GoogleDataChart loader={customLoader} style={{ display: 'inline-block', width: 350, margin: 20, border: '1px solid #eee', padding: 10 }} key={i} views={views} config={c} />)}
          <GoogleDataLive loader={customLoader} style={{ display: 'inline-block', width: 350, margin: 20, border: '1px solid #eee', padding: 10 }} views={views} config={ACTIVE_USERS} />
        </GoogleProvider>
      </div>
    )
  }
}

render(<Example />, document.getElementById("demo"))
