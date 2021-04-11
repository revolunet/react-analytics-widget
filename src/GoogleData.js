import React from 'react';
import './styles/style.css';

const DEFAULT_LOADING = <div className="widgetAnalytics_loaderSpinner"></div>
const DEFAULT_ERROR = <div className="widgetAnalytics_errorCircle"><div>X</div></div>
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
    visualization: null,
    deltaClass: null
  };

  pausePolling = this.pausePolling.bind(this);
  resumePolling = this.resumePolling.bind(this);
  stopPolling = this.stopPolling.bind(this);

  pausePolling() {
    this.realTime.pause();
  };

  stopPolling() {
    this.realTime.stop();
  };

  resumePolling() {
    if (this.realTime.polling_) {
      this.realTime.execute();
    }
  };

  componentDidMount() {
    this.loadData();
  };

  componentDidUpdate(prevProps) {

    // Prevent double execution on load
    if (JSON.stringify(this.props.views) !== JSON.stringify(prevProps.views)) {
      this.updateView();
    }

  };

  componentWillUnmount() {

    this.realTime.off('success');
    this.realTime.off('error');
    this.realTime.off('change');

    this.realTime.stop();

    window.removeEventListener('blur', this.pausePolling, false);
    window.removeEventListener('focus', this.resumePolling, false);

  };

  loadData = () => {
    const config = {
      ...this.props.config
    };

    this.realTime = new gapi.analytics.ext.RealTime(config)

      .on('success', () => {
        this.setState({ isLoading: false });
      })

      .on('change', ({ realTime }) => {

        const visualization = this.dataToVisualization(realTime);
        const value = realTime.totalResults ? +realTime.rows[0][0] : 0;

        let deltaClass;

        // Check if the response has multiples columns or only one
        if ((realTime.columnHeaders.length === 1)) {

          const delta = value - (this.lastValue | 0);

          // Add CSS animation to visually show the when the counter goes up and down
          deltaClass = delta > 0 ? "widgetAnalytics_isIncreasing" : "widgetAnalytics_isDecreasing";

          let timeout;
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            this.setState({ deltaClass: null })
          }, 3000);

          this.lastValue = value;
        }

        this.setState({ visualization, deltaClass });

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
        <span className="widgetAnalytics_realTimeValueNumber">{count}</span>
      )

      // Complex result
    } else {

      return (
        <table className="widgetAnalytics_realTimeTable">
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
    const classes = ["widgetAnalytics_widget", "widgetAnalytics_widgetRealTime"];
    if (this.state.isError) classes.push("widgetAnalytics_onError");
    if (this.state.isLoading) classes.push("widgetAnalytics_onLoading");
    if (this.props.className) classes.push(this.props.className);
    if (this.state.deltaClass) classes.push(this.state.deltaClass);

    return (
      <div
        className={classes.join(' ')}
        style={{ ...this.props.style, position: 'relative' }}
      >
        <div className="widgetAnalytics_widgetRealTimeContainer">
          {
            this.props.config.options && this.props.config.options.title &&
            <div className="widgetAnalytics_realTimeTitle">
              {this.props.config.options.title}
            </div>
          }
          <div className="widgetAnalytics_realTimeValue">
            {this.state.visualization}
          </div>
        </div>
        {
          this.state.isLoading &&
          <div className="widgetAnalytics_loader">
            {this.props.loader !== undefined ? this.props.loader : DEFAULT_LOADING}
          </div>
        }
        {
          this.state.isError &&
          <div
            title={(this.props.errors) ? this.state.isError : ''}
            className="widgetAnalytics_errorContainer"
          >
            {
              this.props.errors &&
              <div className="widgetAnalytics_errorMsg">
                {this.state.isError}
              </div>
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

  componentDidUpdate(prevProps, prevState) {

    if (JSON.stringify(this.props.views) !== JSON.stringify(prevProps.views)) {

      this.updateView();

      if (!prevState.isLoading) {
        let height = this.chartNode.clientHeight;
        this.chartNode.style.height = height + 'px';
      } else if (!this.state.isLoading) {
        this.chartNode.style.height = '';
      }

    }

  };

  componentWillUnmount() {
    this.chart.off('success');
    this.chart.off('error');
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

    const classes = ["widgetAnalytics_widget", "widgetAnalytics_widgetChart"];
    if (this.state.isError) classes.push("widgetAnalytics_onError");
    if (this.state.isLoading) classes.push("widgetAnalytics_onLoading");
    if (this.props.className) classes.push(this.props.className);

    return (
      <div
        style={{ ...this.props.style, position: 'relative' }}
        className={classes.join(' ')}
      >
        <div
          className="widgetAnalytics_widgetChartContainer"
          ref={node => (this.chartNode = node)}
        />
        {
          this.state.isLoading &&
          <div className="widgetAnalytics_loader">
            {this.props.loader !== undefined ? this.props.loader : DEFAULT_LOADING}
          </div>
        }
        {
          this.state.isError &&
          <div
            title={(this.props.errors) ? this.state.isError : ''}
            className="widgetAnalytics_errorContainer"
          >
            {
              this.props.errors &&
              <div className="widgetAnalytics_errorMsg">
                {this.state.isError}
              </div>
            }
            {DEFAULT_ERROR}
          </div>
        }
      </div>
    );
  };
}