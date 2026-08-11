<template>
  <svg class="violin-range" :width="width" :height="totalHeight" v-if="hasDomain">

    <text class="handle-label" :x="clampLabelX(minPx)" y="10" text-anchor="middle">{{ format(liveMin) }}</text>
    <text class="handle-label" :x="clampLabelX(maxPx)" y="10" text-anchor="middle">{{ format(liveMax) }}</text>

    <g :transform="`translate(0, ${labelHeight})`">
      <path v-if="violinPath" :d="violinPath" fill="rgba(99, 99, 102, 0.35)"></path>

      <rect class="dim-rect" :x="0" :width="minPx" :height="violinHeight" fill="white" opacity="0.55"></rect>
      <rect class="dim-rect" :x="maxPx" :width="width - maxPx" :height="violinHeight" fill="white" opacity="0.55"></rect>

      <line class="handle-line" :x1="minPx" :x2="minPx" y1="0" :y2="violinHeight"></line>
      <line class="handle-line" :x1="maxPx" :x2="maxPx" y1="0" :y2="violinHeight"></line>

      <circle ref="minHandle" class="handle-grip" :cx="minPx" :cy="violinHeight / 2" r="6"></circle>
      <circle ref="maxHandle" class="handle-grip" :cx="maxPx" :cy="violinHeight / 2" r="6"></circle>
    </g>

  </svg>
</template>

<script>

import * as d3 from 'd3';

export default {
  name: "ViolinRange",
  props: {
    text: String,
    min_base: Number,
    max_base: Number,
    density: {
      // {points: [{value, density}, ...], domainMin, domainMax, maxDensity} - the true, untrimmed
      // data extent, independent of min_base/max_base: the violin always draws the full shape,
      // the two handles just mark where the currently active min/max sit within it.
      type: Object,
      default: null,
    },
    width: {
      type: Number,
      default: 280,
    },
    violinHeight: {
      type: Number,
      default: 30,
    },
  },
  emits: ['update-extent'],
  data() {
    return {
      liveMin: this.min_base,
      liveMax: this.max_base,
      labelHeight: 14,
    };
  },
  computed: {
    hasDomain() {
      return !!this.density && this.density.domainMax > this.density.domainMin;
    },
    totalHeight() {
      return this.violinHeight + this.labelHeight;
    },
    domainScale() {
      return d3.scaleLinear().domain([this.density.domainMin, this.density.domainMax]).range([0, this.width]).clamp(true);
    },
    minPx() {
      return this.domainScale(this.liveMin);
    },
    maxPx() {
      return this.domainScale(this.liveMax);
    },
    violinPath() {
      if (!this.density.points.length) {
        return '';
      }

      const yScale = d3.scaleLinear().domain([0, this.density.maxDensity || 1]).range([0, this.violinHeight / 2]);
      const center = this.violinHeight / 2;

      const top = this.density.points.map(p => `${this.domainScale(p.value)},${center - yScale(p.density)}`);
      const bottom = this.density.points.slice().reverse().map(p => `${this.domainScale(p.value)},${center + yScale(p.density)}`);

      return `M${top.join('L')}L${bottom.join('L')}Z`;
    },
  },
  watch: {
    min_base(newVal) {
      this.liveMin = newVal;
    },
    max_base(newVal) {
      this.liveMax = newVal;
    },
  },
  methods: {
    format(value) {
      return d3.format(",.4~g")(value);
    },
    clampLabelX(x) {
      return Math.min(this.width - 14, Math.max(14, x));
    },
    commit() {
      this.$emit('update-extent', {min: this.liveMin, max: this.liveMax, accessor: this.text});
    },
    // A handle's on-screen position is clamped to this violin's 1st-99th percentile window, so a
    // value outside that window (e.g. an outlier max) renders pinned to the edge. Interpreting drag
    // movement as an absolute pixel->value mapping would then snap the value to the window boundary
    // the instant the handle is touched, discarding the real value. Instead we record, at drag start,
    // the gap between the true value and what that same clamped pixel would naively invert to, and
    // keep applying that gap throughout the gesture - so dragging is continuous from the true value,
    // and only reaches the window's own values once the user has actually dragged that far.
    dragHandle(getCurrentValue, getBounds, setValue) {
      let offset = 0;
      return d3.drag()
          .on('start', (event) => {
            offset = getCurrentValue() - this.domainScale.invert(event.x);
          })
          .on('drag', (event) => {
            const [lo, hi] = getBounds();
            const value = Math.min(hi, Math.max(lo, this.domainScale.invert(event.x) + offset));
            setValue(value);
          })
          .on('end', () => this.commit());
    },
  },
  mounted() {
    this.dragHandle(
        () => this.liveMin,
        () => [-Infinity, this.liveMax],
        (value) => { this.liveMin = value; },
    )(d3.select(this.$refs.minHandle));

    this.dragHandle(
        () => this.liveMax,
        () => [this.liveMin, Infinity],
        (value) => { this.liveMax = value; },
    )(d3.select(this.$refs.maxHandle));
  },
};

</script>


<style scoped>
.violin-range {
  display: block;
}

.handle-label {
  font-size: 10px;
  fill: rgb(99, 99, 102);
}

.handle-line {
  stroke: rgb(99, 99, 102);
  stroke-width: 1;
  stroke-dasharray: 2 2;
}

.handle-grip {
  fill: white;
  stroke: rgb(99, 99, 102);
  stroke-width: 2px;
  cursor: grab;
}
</style>
