// Copyright 2015 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/* global gapi */


gapi.analytics.ready(function () {
  gapi.analytics.createComponent('RealTime', {

    initialize: function () {
      this.realTime = 0;
      gapi.analytics.auth.once('signOut', this.handleSignOut_.bind(this));
    },

    execute: function () {
      // Stop any polling currently going on.
      if (this.polling_) {
        this.stop();
      }

      this.render_();

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

    render_: function () {
      const opts = this.get();

      // Render the component inside the container.
      this.container = typeof opts.container == 'string' ?
        document.getElementById(opts.container) : opts.container;

      this.container.innerHTML = opts.template || this.template;
      this.container.querySelector('.analytics-widget_data-live_value').innerHTML = this.realTime;
      if (opts.options.title)
        this.container.querySelector('.analytics-widget_widget-title').innerHTML = opts.options.title;
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
          const result = response.result;

          if (result.columnHeaders.length > 1) {

            let table = '<table class="analytics-widget_table">';

            table += "<tr>";
            for (const column of result.columnHeaders) {
              table += "<th>" + column.name.replace('rt:', '') + "</th>";
            }

            table += "</tr>";

            if (result.totalResults) {

              for (const row of result.rows) {
                table += "<tr>";
                for (const cell of row) {
                  table += "<td>" + cell + "</td>";
                }
                table += "</tr>";
              }
              
            } else {

              // Default empty value
              table += "<tr><td>-</td><td>-</td></tr>";

            }

            table += "</table>";

            const newValue = table;
            const oldValue = this.realTime;

            const newValueCount = result.totalResults;
            const oldValueCount = this.realTimeCount;

            this.emit('success', { realTime: this.realTime });

            if (newValue != oldValue) {
              this.realTime = newValue;
              this.realTimeCount = newValueCount;
              this.onChange_(newValueCount - oldValueCount);
            }

          } else {

            const newValueCount = result.totalResults ? +result.rows[0][0] : 0;
            const oldValueCount = this.realTimeCount;

            const newValue = `<span class="analytics-widget_data-number">${newValueCount}</span>`;

            this.emit('success', { realTime: this.realTime });

            if (newValueCount != oldValueCount) {
              this.realTime = newValue;
              this.realTimeCount = newValueCount;
              this.onChange_(newValueCount - oldValueCount);
            }

          }

          if (this.polling_ == true) {
            this.timeout_ = setTimeout(this.pollrealTime_.bind(this),
              pollingInterval);
          }
        }.bind(this)).catch(function (e) {
          this.emit('error', JSON.parse(e.body));
          this.stop();
        }.bind(this));

    },

    onChange_: function (delta) {
      const valueContainer = this.container.querySelector('.analytics-widget_data-live_value');
      if (valueContainer) valueContainer.innerHTML = this.realTime;

      this.emit('change', { realTime: this.realTime, delta: delta });
      if (delta > 0) {
        this.emit('increase', { realTime: this.realTime, delta: delta });
      } else {
        this.emit('decrease', { realTime: this.realTime, delta: delta });
      }
    },

    handleSignOut_: function () {
      this.stop();
      gapi.analytics.auth.once('signIn', this.handleSignIn_.bind(this));
    },

    handleSignIn_: function () {
      this.pollrealTime_();
      gapi.analytics.auth.once('signOut', this.handleSignOut_.bind(this));
    },

    template: '<div class="analytics-widget_data-live"><div class="analytics-widget_widget-title"></div><div class="analytics-widget_data-live_value"></div></div>'

  });
});