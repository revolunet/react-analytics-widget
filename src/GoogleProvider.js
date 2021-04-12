import React from 'react';
import PropTypes from 'prop-types';

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

  componentDidUpdate(prevProps) {
    // If the token has changed
    if (
      this.state.ready &&
      this.props.accessToken !== prevProps.accessToken
    ) {
      gapi.auth.setToken({
        access_token: this.props.accessToken
      })
    }
  }

  init() {

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

    const addRealTimeController = () => {

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
          this.realTime = { rows: [] };
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

              // If the values ​​changed
              if (JSON.stringify(this.realTime.rows) !== JSON.stringify(result.rows)) {
                this.onChange_({ realTime: result });
              }

              this.onSuccess_({ realTime: result });
              this.forcePause_ = false;
              this.realTime = result;

              return;

            } catch (err) {


              // If the error has no body, isn't coming from the API
              if (!err.hasOwnProperty('body')) {
                this.stop();
                return this.onError_({ error: err });
              }

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

        onChange_: function (data) {
          this.emit('change', data);
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
        addRealTimeController();
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
        gapi.analytics.auth.on("signIn", _ => {
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