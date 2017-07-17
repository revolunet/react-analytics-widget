import React from 'react';
import { render } from 'react-dom';

// wait for auth to display children
export class GoogleProvider extends React.Component {
  state = {
    ready: false,
  };
  componentDidMount() {
    this.init();
  }
  init = () => {
    const doAuth = () => {
      gapi.analytics.auth &&
        gapi.analytics.auth.authorize({
          clientid: this.props.clientId,
          container: this.authButtonNode,
        });
    };
    gapi.analytics.ready(a => {
      gapi.analytics.auth.on('success', response => {
        this.setState({
          ready: true,
        });
      });
      doAuth();
    });
  };
  render() {
    return (
      <div>
        <div ref={node => (this.authButtonNode = node)} />
        {this.state.ready && this.props.children}
      </div>
    );
  }
}

// single chart
export class GoogleDataChart extends React.Component {
  componentDidMount() {
    this.loadChart();
  }
  componentWillUpdate() {
    this.loadChart();
  }
  componentWillUnmount() {
    console.log('componentWillUnmount');
    // TODO: cleanup
  }
  loadChart = () => {
    const config = {
      ...this.props.config,
      chart: {
        ...this.props.config.chart,
        container: this.chartNode,
      },
    };
    this.chart = new gapi.analytics.googleCharts.DataChart(config);
    this.chart.set(this.props.views).execute();
  };
  render() {
    return (
        <div className={this.props.className} style={this.props.style} ref={node => (this.chartNode = node)} />
    );
  }
}

