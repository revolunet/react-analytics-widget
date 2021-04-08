import React from "react";
import PropTypes from 'prop-types';
import "./base.css";

// dont wait for auth twice, even after unmounts
let isLoaded = false;

// wait for auth to display children
export class GoogleProvider extends React.Component {
  state = {
    ready: false
  };
  componentDidMount() {
    this.init();
  }
  init = () => {
    const doAuth = () => {
      const authObj = this.props.accessToken ?
        { serverAuth: { access_token: this.props.accessToken } } :
        { clientid: this.props.clientId };
      gapi.analytics.auth &&
        gapi.analytics.auth.authorize({
          ...authObj,
          container: this.authButtonNode
        });
    };
    gapi.analytics.ready(a => {
      if (isLoaded) {
        this.setState({
          ready: true
        });
        return;
      }
      const authResponse = gapi.analytics.auth.getAuthResponse();
      if (!authResponse) {
        gapi.analytics.auth.on("success", response => {
          this.setState({
            ready: true
          });
        });
      } else {
        this.setState({
          ready: true
        });
      }
      doAuth();
    });
  };
  render() {
    return (
      <div>
        {this.props.clientId && <div ref={node => (this.authButtonNode = node)} />}
        {this.state.ready && this.props.children}
      </div>
    );
  }
}

GoogleProvider.propTypes = {
  clientId: PropTypes.string,
  accessToken: PropTypes.string,
}


const BASE_CLASS = 'analytics-widget';
const CLASSES = {
  widget: BASE_CLASS,
  widgetChart: BASE_CLASS + '_widget-chart',
  widgetData: BASE_CLASS + '_widget-data',
  chart: BASE_CLASS + '_chart',
  data: BASE_CLASS + '_data',
  error: BASE_CLASS + '_error',
  errorMsg: BASE_CLASS + '_error-msg',
  loading: BASE_CLASS + '_loading',
  loader: BASE_CLASS + '_loader',
  increasing: BASE_CLASS + '_is-increasing',
  decreasing: BASE_CLASS + '_is-decreasing',
}

const DEFAULT_LOADING = <div className={CLASSES.loader + "-spinner"}></div>

// real time data for active users
export class GoogleDataLive extends React.Component {

  state = {
    isLoading: true
  };

  componentDidMount() {
    const checkExist = setInterval(() => {
      // Wait until this component is loaded
      if (typeof gapi.analytics.ext !== undefined) {
        clearInterval(checkExist);
        this.loadData();
      }
    }, 100)
  };

  componentDidUpdate(nextProps) {
    // Prevent double execution on load
    if (this.props.views !== nextProps.views) {
      this.updateView();
    }
  };

  componentWillUnmount() {
  };

  loadData = () => {
    const config = {
      ...this.props.config,
      container: this.dataNode
    };

    const element = this.dataNode;
    let timeout;

    this.realTime = new gapi.analytics.ext.RealTime(config)

      .on('success', () => {

        this.setState({ isLoading: false });

      })

      .on('change', data => {
        // Add CSS animation to visually show the when users come and go.
        const animationClass = data.delta > 0 ? CLASSES.increasing : CLASSES.decreasing;
        element.className += (' ' + animationClass);

        clearTimeout(timeout);
        timeout = setTimeout(() => {
          element.className =
            element.className.replace(/ is-(increasing|decreasing)/g, '');
        }, 3000);
      })

      .on('error', ({ error }) => {
        this.setState({
          isError: error.message,
          isLoading: false
        })
      })

    this.updateView();

  };

  updateView = () => {
    this.setState({
      isError: false,
      isLoading: true
    });

    this.realTime.set(this.props.views.query).execute();
  };

  render() {

    const classes = [CLASSES.widget, CLASSES.widgetData];
    if (this.state.isError) classes.push(CLASSES.error);
    if (this.state.isLoading) classes.push(CLASSES.loading);
    if (this.props.className) classes.push(this.props.className);

    return (
      <div
        className={classes.join(' ')}
        style={{ ...this.props.style, position: 'relative' }}
      >
        <div
          style={{ width: this.props.style.width }}
          ref={node => (this.dataNode = node)}
        />
        {
          this.state.isLoading &&
          <div className={CLASSES.loader}>{this.props.loader !== undefined ? this.props.loader : DEFAULT_LOADING}</div>
        }
        {
          this.state.isError &&
          <div className={CLASSES.errorMsg}>{this.state.isError}</div>
        }
      </div>
    );
  }
}

// single chart
export class GoogleDataChart extends React.Component {

  state = {
    isLoading: true,
    isError: null
  };

  componentDidMount() {
    this.loadChart();
  };

  componentWillUpdate(nextProps, nextState) {
    if (JSON.stringify(this.props.views) !== JSON.stringify(nextProps.views)) {

      if (!nextState.isLoading) {
        let height = this.chartNode.clientHeight;
        this.chartNode.style.height = height + 'px';
      } else {
        this.chartNode.style.height = '';
      }

    }
  };

  componentDidUpdate(nextProps) {
    // Prevent double execution on load
    if (JSON.stringify(this.props.views) !== JSON.stringify(nextProps.views)) {
      this.updateView();
    }
  };

  componentWillUnmount() {
    // TODO: cleanup
  };

  loadChart = () => {
    const config = {
      ...this.props.config,
      chart: {
        ...this.props.config.chart,
        container: this.chartNode
      }
    };

    this.chart = new gapi.analytics.googleCharts.DataChart(config)
      .on('success', () => {
        this.setState({
          isError: null,
          isLoading: false
        });
      })
      .on('error', ({ error }) => {
        this.setState({
          isError: error.message,
          isLoading: false
        })
      })

    this.updateView();

  };

  updateView = () => {
    this.setState({
      isError: false,
      isLoading: true
    });
    this.chart.set(this.props.views).execute();
  };

  render() {

    const classes = [CLASSES.widget, CLASSES.widgetChart];
    if (this.state.isError) classes.push(CLASSES.error);
    if (this.state.isLoading) classes.push(CLASSES.loading);
    if (this.props.className) classes.push(this.props.className);

    return (
      <div
        style={{ ...this.props.style, position: 'relative' }}
        className={classes.join(' ')}
      >
        <div
          style={{ width: this.props.style.width }}
          className={CLASSES.chart}
          ref={node => (this.chartNode = node)}
        />
        {
          this.state.isLoading &&
          <div className={CLASSES.loader}>{this.props.loader !== undefined ? this.props.loader : DEFAULT_LOADING}</div>
        }
        {
          this.state.isError &&
          <div className={CLASSES.errorMsg}>{this.state.isError}</div>
        }
      </div>
    );
  };
}