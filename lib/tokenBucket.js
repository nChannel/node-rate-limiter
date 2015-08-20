
/**
 * A hierarchical token bucket for rate limiting. See
 * http://en.wikipedia.org/wiki/Token_bucket for more information.
 * @author John Hurliman <jhurliman@cull.tv>
 *
 * @param {Number} bucketSize Maximum number of tokens to hold in the bucket.
 *  Also known as the burst rate.
 * @param {Number} tokensPerInterval Number of tokens to drip into the bucket
 *  over the course of one interval.
 * @param {String|Number} interval The interval length in milliseconds, or as
 *  one of the following strings: 'second', 'minute', 'hour', day'.
 */
var TokenBucket = function(bucketSize, tokensPerInterval, interval) {
  this.bucketSize = bucketSize;
  this.tokensPerInterval = tokensPerInterval;

  if (typeof interval === 'string') {
    switch (interval) {
      case 'sec': case 'second':
        this.interval = 1000; break;
      case 'min': case 'minute':
        this.interval = 1000 * 60; break;
      case 'hr': case 'hour':
        this.interval = 1000 * 60 * 60; break;
      case 'day':
        this.interval = 1000 * 60 * 60 * 24; break;
    }
  } else {
    this.interval = interval;
  }

  this.content = 0;
  this.lastDrip = +new Date();

  this.storage = {};
};

TokenBucket.prototype = {
  bucketSize: 1,
  tokensPerInterval: 1,
  interval: 1000,
  // content: 0,
  // lastDrip: 0,

  /**
   * Remove the requested number of tokens and fire the given callback. If the
   * bucket (and any parent buckets) contains enough tokens this will happen
   * immediately. Otherwise, the removal and callback will happen when enough
   * tokens become available.
   * @param {Number} count The number of tokens to remove.
   * @returns {Boolean} True if transaction has been accepted, false otherwise
   */
  accept: function(count, uniqueID) {
    var self = this;

    // Get the uniqueID or default to a generated string
    uniqueID = uniqueID || (Math.random().toString(36).slice(2));

    // Set/Create storage object for the uniqueID to segment out each throttle application
    var app = self.storage[uniqueID] = self.storage[uniqueID] || {
      lastDrip: 0,
      content: 0
    };

    // Is this an infinite size bucket?
    if (!this.bucketSize) {
      return true;
    }

    // Make sure the bucket can hold the requested number of tokens
    if (count > this.bucketSize) {
      return false;
    }

    // Drip new tokens into this bucket
    this.drip(app);

    // If we don't have enough tokens in this bucket, do nothing
    if (count > app.content) {
      return false;
    }

    // Remove the requested tokens from this bucket and fire the callback
    self.storage[uniqueID].content -= count;

    return true;
  },

  /**
   * Add any new tokens to the bucket since the last drip.
   * @returns {Boolean} True if new tokens were added, otherwise false.
   */
  drip: function(app) {
    if (!this.tokensPerInterval) {
      app.content = this.bucketSize;
      return;
    }

    var now = +new Date();
    var deltaMS = Math.max(now - app.lastDrip, 0);
    app.lastDrip = now;

    var dripAmount = deltaMS * (this.tokensPerInterval / this.interval);
    app.content = Math.min(app.content + dripAmount, this.bucketSize);

  }
};

module.exports = TokenBucket;
