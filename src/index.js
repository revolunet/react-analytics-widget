import React from 'react';
import PropTypes from 'prop-types';
import './analytics-widget.css';

// dont wait for auth twice, even after unmounts
let isLoaded = false;
let isLoadedRealTimeController = false;

// wait for auth to display children
export class GoogleProvider extends React.Component {
  state = {
    ready: false,
    readyRealTime: false
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

    const realTimeController = () => {

      /**
       * This function is an adaptation from one by Google.
       * 
       * It's simplified, now has support for other metrics besides ActiveUsers, 
       * supports dimensions and has error handling (previously non-existent).
       * 
       * The original file is:
       * https://ga-dev-tools.appspot.com/public/javascript/embed-api/components/active-users.js"
       */
      gapi.analytics.createComponent('RealTime', {

        initialize: function () {
          this.realTime = null;
          gapi.analytics.auth.once('signOut', this.handleSignOut_.bind(this));
        },

        execute: function () {
          // Stop any polling currently going on.
          if (this.polling_) {
            this.stop();
          }
          // Wait until the user is authorized.
          if (gapi.analytics.auth.isAuthorized()) {
            this.pollrealTime_();
          } else {
            gapi.analytics.auth.once('signIn', this.pollrealTime_.bind(this));
          }
        },

        stop: function () {
          clearTimeout(this.timeout_);
          this.polling_ = false;
          this.emit('stop', { realTime: this.realTime });
        },

        pollrealTime_: function () {
          const options = this.get();
          const pollingInterval = (options.pollingInterval || 5) * 1000;

          if (isNaN(pollingInterval) || pollingInterval < 5000) {
            throw new Error('Frequency must be 5 seconds or more.');
          }

          this.polling_ = true;

          gapi.client.analytics.data.realtime
            .get({ ids: options.ids, metrics: options.query.metrics, dimensions: options.query.dimensions })

            .then(function (response) {

              this.realTime = response.result;
              this.emit('success', { realTime: this.realTime });

              if (this.polling_ == true) {
                this.timeout_ = setTimeout(this.pollrealTime_.bind(this),
                  pollingInterval);
              }
            }.bind(this)).catch(function (e) {
              this.emit('error', JSON.parse(e.body));
              this.stop();
            }.bind(this));

        },

        handleSignOut_: function () {
          this.stop();
          gapi.analytics.auth.once('signIn', this.handleSignIn_.bind(this));
        },

        handleSignIn_: function () {
          this.pollrealTime_();
          gapi.analytics.auth.once('signOut', this.handleSignOut_.bind(this));
        }
      });
    }

    gapi.analytics.ready(() => {

      if (!isLoadedRealTimeController) {
        realTimeController();
        this.setState({
          readyRealTime: true
        });
      }

      if (isLoaded) {
        this.setState({
          ready: true
        });
        return;
      }
      const authResponse = gapi.analytics.auth.getAuthResponse();
      if (!authResponse) {
        gapi.analytics.auth.on("success", _ => {
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

  error: BASE_CLASS + '_error',
  errorContainer: BASE_CLASS + '_error-container',
  errorMsg: BASE_CLASS + '_error-msg',
  loading: BASE_CLASS + '_loading',
  loader: BASE_CLASS + '_loader',

  widgetChart: BASE_CLASS + '_widget-chart',
  chartContainer: BASE_CLASS + '_widget-chart_container',

  widgetRt: BASE_CLASS + '_widget-rt',
  rtContainer: BASE_CLASS + '_widget-rt_container',
  rtTable: BASE_CLASS + '_widget-rt_table',
  rtTitle: BASE_CLASS + '_widget-rt_title',
  rtValue: BASE_CLASS + '_widget-rt_value',
  rtValueNumber: BASE_CLASS + '_widget-rt_value-number',
  rtIncreasing: BASE_CLASS + '_widget-rt_is-increasing',
  rtDecreasing: BASE_CLASS + '_widget-rt_is-decreasing',
}

const DEFAULT_LOADING = <div className={CLASSES.loader + '-spinner'}></div>
const DEFAULT_ERROR = <div className={CLASSES.widget + '_error-circle'}><div>X</div></div>
const DEFAULT_CHART = {
  type: "LINE",
  options: {
    width: '100%'
  }
}

// real time data
export class GoogleDataRT extends React.Component {

  state = {
    isError: false,
    isLoading: true,
    rawValue: null,
    visualization: null,
    classVariation: null
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

  componentWillUpdate(_, nextState) {
    if (nextState.rawWalue !== this.state.rawValue &&
      nextState.classVariation !== this.state.classVariation) {

      // Only affects simple values (number count), not tables
      if (typeof this.state.rawValue == 'number') {

        const delta = nextState.rawValue - this.state.rawValue;
        let timeout;

        // Add CSS animation to visually show the when the counter goes up and down
        const animationClass = delta >= 0 ? CLASSES.rtIncreasing : CLASSES.rtDecreasing;
        this.setState({ classVariation: animationClass })

        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.setState({ classVariation: null })
        }, 3000);

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


  /**
   * Creates a simple table to show results with multiples columns (dimensions),
   * or show the value as an unique number (Ex: Actives users: 10)
   * 
   * This function can be overwritten passing a 'customOutput' prop,
   * and used that to display custom charts or tables.
   * 
   * @param {object} realTimeData Google Api response
   * @param {array}  realTimeData.columnHeaders Name of the columns returned
   * @param {string} realTimeData.ids
   * @param {string} realTimeData.kind
   * @param {object} realTimeData.profileInfo
   * @param {string} realTimeData.query
   * @param {array}  [realTimeData.rows] Rows if there is results
   * @param {string} realTimeData.selfLink
   * @param {number} realTimeData.totalResults Total count
   * @param {object} realTimeData.totalsForAllResults
   * @returns {component}
   */
  dataToVisualization = (realTimeData) => {

    // Check if the customOutput prop exists
    if (this.props.customOutput) {
      return this.props.customOutput(realTimeData);
    }

    // Simple result
    if (realTimeData.columnHeaders.length === 1) {

      const count = realTimeData.totalResults ? +realTimeData.rows[0][0] : 0;
      return (
        <span className={CLASSES.rtValueNumber}>{count}</span>
      )

      // Complex result
    } else {

      return (
        <table className={CLASSES.rtTable}>
          <tbody>
            <tr>
              {
                // Get the headers
                realTimeData.columnHeaders.map((column, key) => {
                  let columnName = column.name.replace('rt:', '');
                  columnName = columnName.charAt(0).toUpperCase() + columnName.slice(1)
                  columnName = columnName.replace(/([A-Z])/g, ' $1').trim()
                  return <th key={key}>{columnName}</th>;
                })
              }
            </tr>
            {
              // If no results
              (!realTimeData.totalResults) ?

                // Show default empty value
                <tr><td>-</td><td>-</td></tr> :

                // Otherwise, loop between results
                realTimeData.rows.map((row, key) => {
                  return (
                    <tr>
                      {
                        row.map((cell, key2) => {
                          return <td key={key + ' ' + key2}>{cell}</td>;
                        })
                      }
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      )
    }

  };

  loadData = () => {
    const config = {
      ...this.props.config
    };

    this.realTime = new gapi.analytics.ext.RealTime(config)

      .on('success', ({ realTime }) => {

        let rawValue;
        this.setState({ isLoading: false });

        // If the response has multiples columns
        if (realTime.columnHeaders.length > 1) {

          rawValue = JSON.stringify(realTime.rows);
          // If values hasn't changed, do nothing
          if (this.state.rawValue === rawValue) {
            return;
          }

        } else {

          rawValue = realTime.totalResults ? +realTime.rows[0][0] : 0;
          // If values hasn't changed, do nothing
          if (this.state.rawValue === rawValue) {
            return;
          }

        }

        const visualization = this.dataToVisualization(realTime);
        this.setState({ rawValue, visualization });

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
    const classes = [CLASSES.widget, CLASSES.widgetRt];
    if (this.state.isError) classes.push(CLASSES.error);
    if (this.state.isLoading) classes.push(CLASSES.loading);
    if (this.props.className) classes.push(this.props.className);
    if (this.state.classVariation) classes.push(this.state.classVariation);

    return (
      <div
        className={classes.join(' ')}
        style={{ ...this.props.style, position: 'relative' }}
      >
        <div className={CLASSES.rtContainer}>
          {
            this.props.config.options && this.props.config.options.title &&
            <div className={CLASSES.rtTitle}>{this.props.config.options.title}</div>
          }
          <div className={CLASSES.rtValue}>
            {this.state.visualization}
          </div>
        </div>
        {
          this.state.isLoading &&
          <div className={CLASSES.loader}>{this.props.loader !== undefined ? this.props.loader : DEFAULT_LOADING}</div>
        }
        {
          this.state.isError &&
          <div title={(this.props.errors) ? this.state.isError : ''} className={CLASSES.errorContainer}>
            {
              this.props.errors &&
              <div className={CLASSES.errorMsg}>{this.state.isError}</div>
            }
            {DEFAULT_ERROR}
          </div>
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
        ...DEFAULT_CHART,
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
          className={CLASSES.chartContainer}
          ref={node => (this.chartNode = node)}
        />
        {
          this.state.isLoading &&
          <div className={CLASSES.loader}>{this.props.loader !== undefined ? this.props.loader : DEFAULT_LOADING}</div>
        }
        {
          this.state.isError &&
          <div title={(this.props.errors) ? this.state.isError : ''} className={CLASSES.errorContainer}>
            {
              this.props.errors &&
              <div className={CLASSES.errorMsg}>{this.state.isError}</div>
            }
            {DEFAULT_ERROR}
          </div>
        }
      </div>
    );
  };
}