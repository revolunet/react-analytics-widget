import React from 'react';
import PropTypes from 'prop-types';
import styles from './analytics-widget.sass';

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
       * This code is an adaptation from one made by Google, available here:
       * https://ga-dev-tools.appspot.com/public/javascript/embed-api/components/active-users.js"
       * 
       * This version has:
       * - dynamic support for metrics (not just "rt:activeUsers") than can be passed as an argument
       * - support for dimensions 
       * - error handling (previously non-existent) performed according to the official documentation,
       * with an exponential backoff before retry subsequent requests.
       * 
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
            this.forcePause_ = false;
          }
          // Wait until the user is authorized.
          if (gapi.analytics.auth.isAuthorized()) {
            this.pollrealTime_();
          } else {
            gapi.analytics.auth.once('signIn', this.pollrealTime_.bind(this));
          }
        },

        stop: function (silent = false) {
          clearTimeout(this.timeout_);
          this.polling_ = false;
          if (!silent) {
            this.emit('stop', { realTime: this.realTime });
          }
        },
        pause: function () {
          console.log('poauseee')
          this.forcePause_ = true;
        },
        pollrealTime_: async function () {

          const options = this.get();
          const pollingInterval = (options.pollingInterval || 5) * 1000;

          const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

          if (isNaN(pollingInterval) || pollingInterval < 5000) {
            throw new Error('Frequency must be 5 seconds or more.');
          }

          this.polling_ = true;

          // https://developers.google.com/analytics/devguides/reporting/realtime/v3/errors#error_table
          // List of errors that are retry-able waiting exponentially
          const retryExpErrors = [
            'userRateLimitExceeded',
            'rateLimitExceeded',
            'quotaExceeded'
          ]

          // List of errors that are retry-able only once
          const retryOnceErrors = [
            'internalServerError',
            'backendError'
          ]

          let errorBody;
          this.retryOnce_ = null;

          // If any error occurs in the makeRequest_ method,
          // the request is retried using an exponential backoff.
          // https://developers.google.com/analytics/devguides/reporting/realtime/v3/errors#backoff
          for (let i = 0; i < 5; i++) {

            try {

              const result = await this.makeRequest_(options, pollingInterval);

              if (result) {
                this.realTime = result;
                this.forcePause_ = false;
                this.onSuccess_({ realTime: this.realTime });
                return;
              }

            } catch (err) {

              // If an error happen, pause automatic interval pulling
              this.forcePause_ = true;

              errorBody = JSON.parse(err.body);

              const { error } = errorBody;
              const { errors } = error;

              // Check if the request must be retried (waiting exponentially)
              const retryExp = errors.some(({ reason }) => retryExpErrors.includes(reason));

              if (!retryExp) {

                // Check if the request must be retried (only once)
                this.retryOnce_ = errors.some(({ reason }) => retryOnceErrors.includes(reason));

                if (!this.retryOnce_) {
                  // The error is "big", the request must not be retried,
                  // break the loop
                  break;
                }

              }

              if (this.retryOnce_ && i > 1) {
                // This request must be retried only once, 
                // and this is the third attempt
                // break the loop
                break;
              }

              // random_number_ms is a random number of milliseconds less than or equal to 1000.
              // This is necessary to avoid certain lock errors in some concurrent implementations.
              const random_number_ms = ~~(Math.random() * 1000);

              // Exponential wait in milliseconds
              const wait = Math.pow(2, i) * 1000;

              await sleep(Math.round(wait + random_number_ms));

            }

          }
          
          this.onError_(errorBody);

        },

        /**
         * The makeRequest_ method makes API requests and emits
         * the response.
         */
        makeRequest_: function (options, pollingInterval) {
          return new Promise((resolve, reject) => {
            console.log('request')
            gapi.client.analytics.data.realtime
              .get({ ids: options.ids, metrics: options.query.metrics, dimensions: options.query.dimensions })
              .then((response) => {
                // If everything is ok, reinitialize
                if (this.polling_ && !this.forcePause_) {
                  this.timeout_ = setTimeout(this.pollrealTime_.bind(this),
                    pollingInterval);
                }
                resolve(response.result);
              })
              .catch((err) => {
                reject(err);
              });
          })
        },

        onSuccess_: function (data) {
          this.emit('success', data);
        },

        onError_: function (err) {
          this.emit('error', err);
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

const DEFAULT_LOADING = <div className={styles.loaderSpinner}></div>
const DEFAULT_ERROR = <div className={styles.errorCircle}><div>X</div></div>
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

  pausePolling = this.pausePolling.bind(this);
  resumePolling = this.resumePolling.bind(this);
  stopPolling = this.stopPolling.bind(this);

  pausePolling() {
    console.log('blur')
    this.realTime.pause();
  };

  stopPolling() {
    console.log('stop')
    this.realTime.stop();
  };

  resumePolling() {
    console.log('focus')
    if (this.realTime.polling_) {
      this.realTime.execute();
    }
  };

  componentDidMount() {
    this.loadData();
  };

  componentWillUpdate(_, nextState) {
    if (nextState.rawWalue !== this.state.rawValue &&
      nextState.classVariation !== this.state.classVariation) {

      // Only affects simple values (number count), not tables
      if (typeof this.state.rawValue == 'number') {

        const delta = nextState.rawValue - this.state.rawValue;
        let timeout;

        // Add CSS animation to visually show the when the counter goes up and down
        const animationClass = delta >= 0 ? styles.isIncreasing : styles.isDecreasing 
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

    this.realTime.stop();

    this.realTime.off('success');
    this.realTime.off('error');

    window.removeEventListener('blur', this.pausePolling, false);
    window.removeEventListener('focus', this.resumePolling, false);

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
        this.setState({ rawValue: rawValue, visualization: visualization });

      })

      .on('error', ({ error }) => {
        this.setState({
          isError: error.message,
          isLoading: false
        })
      })

    this.updateView();

    window.addEventListener('blur', this.pausePolling, false);
    window.addEventListener('focus', this.resumePolling, false);

  };

  updateView = () => {
    this.setState({
      isError: false,
      isLoading: true
    });

    this.realTime.set(this.props.views.query).execute();
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

      const count = realTimeData.totalResults ? +realTimeData.rows[0][0] : 0 + 0;
      return (
        <span className={styles.RTValueNumber}>{count}</span>
      )

      // Complex result
    } else {

      return (
        <table className={styles.RTTable}>
          <tbody>
            <tr>
              {
                // Get the headers
                realTimeData.columnHeaders.map((column, key) => {
                  let columnName = column.name.replace('rt:', '');
                  columnName = columnName.charAt(0).toUpperCase() + columnName.slice(1);
                  columnName = columnName.replace(/([A-Z])/g, ' $1').trim();
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
                    <tr key={key}>
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

  render() {
    const classes = [styles.analyticsWidget, styles.analyticsWidgetRT];
    if (this.state.isError) classes.push(styles.onError);
    if (this.state.isLoading) classes.push(styles.onLoading);
    if (this.props.className) classes.push(this.props.className);
    if (this.state.classVariation) classes.push(this.state.classVariation);

    return (
      <div
        className={classes.join(' ')}
        style={{ ...this.props.style, position: 'relative' }}
      >
        <div className={styles.widgetRTContainer}>
          {
            this.props.config.options && this.props.config.options.title &&
            <div className={styles.RTTitle}>{this.props.config.options.title}</div>
          }
          <div className={styles.RTValue}>
            {this.state.visualization}
          </div>
        </div>
        {
          this.state.isLoading &&
          <div className={styles.loader}>{this.props.loader !== undefined ? this.props.loader : DEFAULT_LOADING}</div>
        }
        {
          this.state.isError &&
          <div title={(this.props.errors) ? this.state.isError : ''} className={styles.errorContainerr}>
            {
              this.props.errors &&
              <div className={styles.errorMsg}>{this.state.isError}</div>
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
    this.realTime.off('success');
    this.realTime.off('error');
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

    const classes = [styles.analyticsWidget, styles.analyticsWidgetChart];
    if (this.state.isError) classes.push(styles.onError);
    if (this.state.isLoading) classes.push(styles.onLoading);
    if (this.props.className) classes.push(this.props.className);

    return (
      <div
        style={{ ...this.props.style, position: 'relative' }}
        className={classes.join(' ')}
      >
        <div
          className={styles.widgetChartContainer}
          ref={node => (this.chartNode = node)}
        />
        {
          this.state.isLoading &&
          <div className={styles.loader}>{this.props.loader !== undefined ? this.props.loader : DEFAULT_LOADING}</div>
        }
        {
          this.state.isError &&
          <div title={(this.props.errors) ? this.state.isError : ''} className={styles.errorContainer}>
            {
              this.props.errors &&
              <div className={styles.errorMsg}>{this.state.isError}</div>
            }
            {DEFAULT_ERROR}
          </div>
        }
      </div>
    );
  };
}